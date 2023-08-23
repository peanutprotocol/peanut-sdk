import requests
import json
import time

# Constants
ASSET_PLATFORMS_URL = "https://api.coingecko.com/api/v3/asset_platforms"
TOKENS_URL_TEMPLATE = "https://tokens.coingecko.com/{}/all.json"


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

    return data["tokens"]


def main():
    print("Fetching token details...")

    # Load chainDetails.json
    with open("chainDetails.json", "r") as f:
        chain_details = json.load(f)

    # Fetch the mapping from chainId to CoinGecko ID
    chain_id_to_coingecko_id = fetch_coingecko_id_to_chain_id_mapping()

    # Initialize tokenDetails list and stats
    tokenDetails = []
    total_tokens = 0
    total_errors = 0
    chains_fetched = 0

    # For each platform, fetch tokens if it's in contracts.json
    for chain_id, details in chain_details.items():
        print(f"Fetching tokens for chainId {chain_id}...")
        coingecko_id = chain_id_to_coingecko_id.get(int(chain_id))
        tokens = []
        if coingecko_id:
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
            print(f"Warning: No CoinGecko ID found for chainId {chain_id}. Skipping.")
            complete_tokens = (
                []
            )  # No tokens could be fetched, so initialize an empty list

        # Add native token first in the list
        # icon: {'url': 'https://ipfs.io/ipfs/QmdwQDr6vmBtXmK2TmknkEuZNoaDqTasFdZdu3DRw8b2wt', 'format': 'png'}
        # logoURI = details.get("icon", [{}])[0].get("url", ""),
        logoURI = details.get("icon").get("url", "")
        # if logo uri has format ipfs://QmdoUtvHDybu5ppYBZT8BMRp6AqByVSoQs8nFwKbaS55jd, replace it with https://ipfs.io/ipfs/QmdoUtvHDybu5ppYBZT8BMRp6AqByVSoQs8nFwKbaS55jd
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

        platform_data = {
            "chainId": chain_id,
            "name": details.get("name", ""),
            "tokens": complete_tokens,
        }
        tokenDetails.append(platform_data)

    # Save to tokenDetails.json without indentation
    with open("tokenDetails.json", "w") as f:
        json.dump(tokenDetails, f)

    # Print stats
    print(f"Total chains fetched: {chains_fetched}")
    print(f"Total tokens recorded: {total_tokens}")
    print(f"Total tokens with complete data: {total_tokens - total_errors}")
    print(f"Total tokens with missing data: {total_errors}")

    # assert that chainDetails.json and tokenDetails.json have the same number of chains
    assert len(chain_details) == len(
        tokenDetails
    ), "chainDetails.json and tokenDetails.json have different number of chains"


if __name__ == "__main__":
    main()
