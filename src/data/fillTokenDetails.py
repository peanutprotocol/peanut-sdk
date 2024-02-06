import requests
import json
import time
import os

# Constants
ASSET_PLATFORMS_URL = "https://api.coingecko.com/api/v3/asset_platforms"
TOKENS_URL_TEMPLATE = "https://tokens.coingecko.com/{}/all.json"
UNISWAP_URL = "https://gateway.ipfs.io/ipns/tokens.uniswap.org"


def fetch_coingecko_id_to_chain_id_mapping():
    response = requests.get(ASSET_PLATFORMS_URL)
    if response.status_code != 200:
        print(
            f"Error fetching asset platforms. HTTP Status Code: {response.status_code}"
        )
        return {}

    platforms = response.json()
    mapping = {}
    for platform in platforms:
        chain_id = platform.get("chain_identifier")
        if chain_id:
            mapping[chain_id] = platform["id"]

    return mapping


def fetch_tokens_for_platform(platform_id):
    url = TOKENS_URL_TEMPLATE.format(platform_id)
    response = requests.get(url)
    if response.status_code != 200:
        print(
            f"Error fetching tokens for platform {platform_id}. HTTP Status Code: {response.status_code}"
        )
        return []

    data = response.json()
    if "tokens" not in data or not isinstance(data["tokens"], list):
        print(
            f"Warning: Expected a list of tokens for platform {platform_id} but received a different data structure."
        )
        return []

    # Check for expected fields in the first token as a sample
    expected_fields = ["address", "decimals", "name", "symbol", "logoURI"]
    if data["tokens"] and not all(
        field in data["tokens"][0] for field in expected_fields
    ):
        print(
            f"Warning: Some expected fields are missing in the tokens data for platform {platform_id}."
        )

    # Return only the first 200 tokens
    # temp fix until we properly implement this (FILTER_TOKEN_DETAILS branch)
    return data["tokens"][:200]


def main():
    print("Fetching token details...")

    # Load chainDetails.json
    with open("chainDetails.json", "r") as f:
        chain_details = json.load(f)

    # Initialize or load tokenDetails.json
    try:
        with open("tokenDetails.json", "r") as f:
            token_details = json.load(f)
    except FileNotFoundError:
        token_details = []

    # Load manual token details
    try:
        with open("tokenDetailsManual.json", "r") as f:
            manual_token_details = json.load(f)
    except FileNotFoundError:
        manual_token_details = []

    # Fetch the mapping from chainId to CoinGecko ID
    chain_id_to_coingecko_id = fetch_coingecko_id_to_chain_id_mapping()

    # Initialize stats
    total_tokens = 0
    total_errors = 0
    chains_fetched = 0

    # For each platform in chainDetails, ensure it exists in tokenDetails
    for chain_id, details in chain_details.items():
        print(f"Processing tokens for chainId {chain_id}...")
        coingecko_id = chain_id_to_coingecko_id.get(int(chain_id))
        tokens = []
        if coingecko_id:
            # Check if the chainId already has tokens fetched
            existing_tokens = next(
                (detail for detail in token_details if detail["chainId"] == chain_id),
                None,
            )
            if existing_tokens and existing_tokens.get("tokens"):
                user_input = (
                    input(
                        f"Tokens already fetched for chainId {chain_id}. Refetch? (y/n): "
                    )
                    .strip()
                    .lower()
                )
                if user_input != "y":
                    print(f"Skipping refetch for chainId {chain_id}.")
                    # Update stats for already fetched tokens
                    total_tokens += len(existing_tokens["tokens"])
                    incomplete_tokens = [
                        token for token in existing_tokens["tokens"]
                        if not all(
                            key in token
                            for key in ["address", "decimals", "name", "symbol", "logoURI"]
                        )
                    ]
                    total_errors += len(incomplete_tokens)
                    continue
            tokens = fetch_tokens_for_platform(coingecko_id)
            # wait for 1 second to avoid rate limit
            time.sleep(1)
            total_tokens += len(tokens)
            chains_fetched += 1

            # Filter out tokens with missing fields
            complete_tokens = [
                {key: value for key, value in token.items() if key not in ["chainId"]}
                for token in tokens
                if all(
                    key in token
                    for key in ["address", "decimals", "name", "symbol", "logoURI"]
                )
            ]
            total_errors += len(tokens) - len(complete_tokens)
        else:
            print(f"Warning: No CoinGecko ID found for chainId {chain_id}.")
            complete_tokens = []

        # Add native token first in the list
        logoURI = details.get("icon", {}).get("url", "")
        if logoURI.startswith("ipfs://"):
            logoURI = "https://ipfs.io/" + logoURI[len("ipfs://"):]
        native_token = {
            "address": "0x0000000000000000000000000000000000000000",
            "name": details["nativeCurrency"]["name"],
            "symbol": details["nativeCurrency"]["symbol"],
            "decimals": details["nativeCurrency"]["decimals"],
            "logoURI": logoURI,
        }
        complete_tokens.insert(0, native_token)

        # Construct platform data for this chain
        platform_data = {
            "chainId": chain_id,
            "name": details.get("name", ""),
            "tokens": complete_tokens,
        }

        # Update or add the platform data in tokenDetails
        existing_index = next(
            (
                i
                for i, detail in enumerate(token_details)
                if detail["chainId"] == chain_id
            ),
            None,
        )
        if existing_index is not None:
            token_details[existing_index] = platform_data
        else:
            token_details.append(platform_data)

    # Merge manual tokens into tokenDetails
    def merge_manual_tokens(token_details, manual_token_details):
        for manual_entry in manual_token_details:
            chain_id = manual_entry["chainId"]
            existing_entry_index = next(
                (i for i, detail in enumerate(token_details) if detail["chainId"] == chain_id),
                None
            )
            if existing_entry_index is not None:
                # Merge tokens if chainId exists
                existing_tokens = token_details[existing_entry_index]["tokens"]
                manual_tokens = manual_entry["tokens"]
                # This simplistic approach adds manual tokens, replacing any existing ones with the same address
                existing_tokens_dict = {token["address"]: token for token in existing_tokens}
                for manual_token in manual_tokens:
                    existing_tokens_dict[manual_token["address"]] = manual_token
                token_details[existing_entry_index]["tokens"] = list(existing_tokens_dict.values())
            else:
                # Add new chainId entry if it doesn't exist
                token_details.append(manual_entry)

    merge_manual_tokens(token_details, manual_token_details)

    # Remove entries from tokenDetails that are not in chainDetails
    token_details = [
        detail for detail in token_details if detail["chainId"] in chain_details
    ]

    # Save to tokenDetails.json
    with open("tokenDetails.json", "w") as f:
        json.dump(token_details, f, indent="\t")
    print(f"Total chains fetched: {chains_fetched}")
    print(f"Total chains actually stored: {len(token_details)}")
    print(f"Total tokens recorded: {total_tokens}")
    print(f"Total tokens with complete data: {total_tokens - total_errors}")
    print(f"Total tokens with missing data: {total_errors}")
    # Assert that chainDetails.json and tokenDetails.json have the same number of chains
    assert len(chain_details) == len(
        token_details
    ), "chainDetails.json and tokenDetails.json have different number of chains"


if __name__ == "__main__":
    main()
