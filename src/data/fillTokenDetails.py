"""
fillTokenDetails: populates tokenDetails.json with ERC20 token info for each chain
present in chainDetails.json.

Resulting list for each chain consists of three parts:
1. Native token.
3. Coingecko list with up to 100 tokens, ordered by marketcap.
2. Tokens from manualTokenDetails.json.

Native token is added automatically at the top of the list for each chain.

Coingecko list is constructed from top 100 tokens by market cap, provided by Moralis:
- Fetch top tokens from Moralis by Ethereum Mainnet market cap.
- Iterate through Moralis top token list to find the same mainnet token address in a
full coingecko token list (get_top_tokens_with_contracts function).
- Copy "platforms" data (<network_name>: <token_address> dict for that token) from
coingecko token list to Moralis list
- Iterate through updated Moralis list and push each token info to corresponding
resulting list
- Add tokens from manualTokenDetails.json to the resulting list
"""

import requests
import json
import os
import dotenv

dotenv.load_dotenv()

# Constants
ASSET_PLATFORMS_URL = "https://api.coingecko.com/api/v3/asset_platforms"
TOP_TOKENS_URL = "https://api.coingecko.com/api/v3/coins/list?include_platform=true"
TOKENS_URL_TEMPLATE = "https://tokens.coingecko.com/{}/all.json"
UNISWAP_URL = "https://gateway.ipfs.io/ipns/tokens.uniswap.org"
TOP_LIST_MORALIS_URL = (
    "https://deep-index.moralis.io/api/v2.2/market-data/erc20s/top-tokens"
)
MORALIS_API_KEY = os.environ.get("MORALIS_API_KEY")

def fetch_tokens_for_platform(platform_id):
    """
        Returns only the first 200 tokens. Not an issue because this method is only
        used for chains that have 0 tokens from the top 100 by market cap.
    """
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
    return data["tokens"][:200]

def moralis_fetch_top_marketcap_list():
    response = requests.get(
        TOP_LIST_MORALIS_URL, headers={"x-api-key": MORALIS_API_KEY}
    )
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 401:
        print(
            "Failed to fetch top tokens by marketcap with status 401. Is your moralis api key correct?"
        )
    else:
        print("Failed to fetch top tokens by marketcap.")


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


def fetch_full_coingecko_list():
    response = requests.get(TOP_TOKENS_URL)
    if response.status_code == 200:
        return response.json()
    else:
        print("Failed to fetch list of all tokens.")


def format_token_fields(moralis_token, coingecko_id):
    return {
        "address": moralis_token["platforms"][coingecko_id],
        "decimals": int(moralis_token["token_decimals"]),
        "name": moralis_token["token_name"],
        "symbol": moralis_token["token_symbol"],
        "logoURI": moralis_token["token_logo"],
    }


def get_top_tokens_with_contracts(top_tokens, full_list):
    """
    Iterate through moralis top token list to find the same token address
    in a full coingecko token list. Populate 'platforms' field in the resulting list
    with contract addresses for different networks.
    """

    top_tokens_by_chain = []
    for top_token in top_tokens:
        for full_list_token in full_list:
            if (
                top_token["contract_address"] != ""
                and top_token["token_symbol"].lower()
                == full_list_token["symbol"].lower()
                and top_token["contract_address"]
                in list(full_list_token["platforms"].values())
            ):
                token_info = top_token.copy()
                token_info["platforms"] = full_list_token["platforms"]
                top_tokens_by_chain.append(token_info)

    return top_tokens_by_chain


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

    # Fetch full token list supported by coingecko
    full_list = fetch_full_coingecko_list()
    if not full_list:
        raise Exception("Top tokens fetch failed, please try again.")

    # Fetch top tokens from moralis
    top_tokens = moralis_fetch_top_marketcap_list()

    # add deployed contract addresses for different networks to top_tokens list
    top_tokens_by_chain = get_top_tokens_with_contracts(top_tokens, full_list)

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
                        token
                        for token in existing_tokens["tokens"]
                        if not all(
                            key in token
                            for key in [
                                "address",
                                "decimals",
                                "name",
                                "symbol",
                                "logoURI",
                            ]
                        )
                    ]
                    total_errors += len(incomplete_tokens)
                    continue

            tokens = [
                format_token_fields(top_token, coingecko_id)
                for top_token in top_tokens_by_chain
                if coingecko_id in top_token["platforms"]
            ]
            
            # If nothing is found from top 100 tokens by market cap, fill it
            # using fetch_tokens_for_platform
            if len(tokens) == 0:
                tokens = fetch_tokens_for_platform(platform_id=coingecko_id)

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

        # Remove native token if already present so it won't get duplicated
        complete_tokens = list(
            filter(
                lambda token: token["symbol"] != details["nativeCurrency"]["symbol"],
                complete_tokens,
            )
        ) 

        # Add native token first in the list
        logoURI = details.get("icon", {}).get("url", "")
        if logoURI.startswith("ipfs://"):
            logoURI = "https://ipfs.io/" + logoURI[len("ipfs://") :]
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
                (
                    i
                    for i, detail in enumerate(token_details)
                    if detail["chainId"] == chain_id
                ),
                None,
            )
            if existing_entry_index is not None:
                # Merge tokens if chainId exists
                existing_tokens = token_details[existing_entry_index]["tokens"]
                manual_tokens = manual_entry["tokens"]
                # This simplistic approach adds manual tokens, replacing any existing ones with the same address
                existing_tokens_dict = {
                    token["address"]: token for token in existing_tokens
                }
                for manual_token in manual_tokens:
                    existing_tokens_dict[manual_token["address"]] = manual_token
                token_details[existing_entry_index]["tokens"] = list(
                    existing_tokens_dict.values()
                )
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
