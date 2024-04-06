import requests
import json
import time
import codecs

# Constants
ASSET_PLATFORMS_URL = "https://api.coingecko.com/api/v3/asset_platforms"
TOKENS_URL_TEMPLATE = "https://tokens.coingecko.com/{}/all.json"
TOKEN_LIST_URL = "https://api.coingecko.com/api/v3/coins/list?include_platform=true"
TOP_TOKENS_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page={}&page={}"
TOP_LIST_MORALIS_URL = (
    "https://deep-index.moralis.io/api/v2.2/market-data/erc20s/top-tokens"
)
MORALIS_API_KEY = "<YOUR_API_KEY_HERE>"


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


def fetch_full_coingecko_list():
    response = requests.get(TOP_TOKENS_URL)
    print(response)
    if response.status_code == 200:
        return response.json()
    else:
        print("Failed to fetch list of all tokens.")


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


def get_top_tokens_with_contracts(top_tokens, full_list):
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

    # Fetch top tokens from moralis
    top_tokens = moralis_fetch_top_marketcap_list()
    if not top_tokens:
        raise Exception("Top tokens fetch failed, please try again.")

    with codecs.open("fullList.json", encoding="utf-8", mode="r") as f:
        full_list = json.load(f)

    # Run this instead to fetch full list from coingecko (careful: rate limits you for a few minutes)
    # full_list = fetch_full_coingecko_list()

    if not full_list:
        raise Exception("Full list fetch failed, please try again.")

    # add deployed contract addresses for different networks to top_tokens list
    top_tokens_by_chain = get_top_tokens_with_contracts(top_tokens, full_list)

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
        if coingecko_id:
            # Filter tokens based on top_tokens_by_chain
            filtered_tokens = []
            for top_token in top_tokens_by_chain:
                if coingecko_id in top_token["platforms"]:
                    filtered_tokens.append(
                        {
                            "address": top_token["contract_address"],
                            "decimals": top_token["token_decimals"],
                            "name": top_token["token_name"],
                            "symbol": top_token["token_symbol"],
                            "logoURI": top_token["token_logo"],
                        }
                    )

            total_tokens += len(filtered_tokens)
            chains_fetched += 1

            # Filter out tokens with missing fields
            complete_tokens = [
                {key: value for key, value in token.items() if key not in ["chainId"]}
                for token in filtered_tokens
                if all(
                    key in token
                    for key in ["address", "decimals", "name", "symbol", "logoURI"]
                )
            ]
            total_errors += len(filtered_tokens) - len(complete_tokens)
        else:
            print(f"Warning: No CoinGecko ID found for chainId {chain_id}. Skipping.")
            complete_tokens = []  # No tokens could be fetched, so initialize an empty list

        # Add native token first in the list
        # logoURI = details.get("icon", [{}])[0].get("url", ""),
        logoURI = details.get("icon").get("url", "")
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

    with open("tokenDetails.json", "w") as f:
        json.dump(tokenDetails[:100], f)  # Save limited token details

    with open("tokenDetailsFull.json", "w") as f:
        json.dump(tokenDetails, f)  # Save full token details without pruning

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
