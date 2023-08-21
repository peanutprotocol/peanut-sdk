import requests
import json
import os
import time

# Existing constants
CONTRACTS_URL = (
    "https://raw.githubusercontent.com/ProphetFund/peanut-contracts/main/contracts.json"
)
CHAIN_DETAILS_PATH = "chainDetails.json"
CHAINS_URL = (
    "https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains"
)
ICONS_URL = "https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons"

# New URLs for additional icon sources
CRYPTO_ICONS_URL = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color"  # append /{icon_name}.svg
# TRUST_WALLET_ICONS_URL = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains"
TRUST_WALLET_ICONS_URL = "https://raw.githubusercontent.com/trustwallet/assets/8ee07e9d791bec6c3ada3cfac73ddfdc4f4a40b7/blockchains/"

# Generic default icon URL (replace with a valid URL of your default icon)
DEFAULT_ICON_URL = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/generic.svg"


def get_contracts():
    response = requests.get(CONTRACTS_URL)
    if response.status_code == 200:
        return response.json()
    return None


def get_chain_ids(contracts):
    chain_ids = list(contracts.keys())
    # filter out all the chain ids that don't have a v3 chain id
    return [chain_id for chain_id in chain_ids if contracts[chain_id].get("v3")]


def get_chain_details(chain_id):
    chain_file = f"eip155-{chain_id}.json"
    response = requests.get(os.path.join(CHAINS_URL, chain_file))
    if response.status_code == 200:
        return response.json()
    return None


def get_chain_icon(possible_chain_names):
    for name in possible_chain_names:
        # First attempt: Existing ICONS_URL
        icon_file = f"{name}.json"
        response = requests.get(os.path.join(ICONS_URL, icon_file))
        if response.status_code == 200:
            icon_info = response.json()[0]
            print(
                "Got icon info from ICONS_URL: ",
                icon_info["url"].replace("ipfs://", "https://ipfs.io/ipfs/"),
            )
            return {
                "url": icon_info["url"].replace("ipfs://", "https://ipfs.io/ipfs/"),
                "format": icon_info["format"],
            }

        # Second attempt: Crypto Icons
        icon_file = f"{name}.svg"
        response = requests.get(os.path.join(CRYPTO_ICONS_URL, icon_file))
        if response.status_code == 200:
            print("Got icon info from CRYPTO_ICONS_URL: ", response.url)
            return {"url": response.url, "format": "svg"}

        # Third attempt: TrustWallet Assets
        icon_file = f"{name}/info/logo.png"
        response = requests.get(os.path.join(TRUST_WALLET_ICONS_URL, icon_file))
        if response.status_code == 200:
            print("Got icon info from TRUST_WALLET_ICONS_URL: ", response.url)
            return {"url": response.url, "format": "png"}

    # If none of the above succeed, return a default icon
    print(
        "Failed to get icon info. Returning default icon. Failed for names: ",
        possible_chain_names,
    )
    return {"url": DEFAULT_ICON_URL, "format": "png"}


def main():
    contracts = get_contracts()
    if not contracts:
        print("Failed to get contracts.")
        return

    chain_ids = get_chain_ids(contracts)
    print(f"Found {len(chain_ids)} chain ids with a v3 chain id. Fetching details...")
    print(chain_ids)

    # Load existing chain details if the file exists
    if os.path.exists(CHAIN_DETAILS_PATH):
        with open(CHAIN_DETAILS_PATH, "r") as file:
            chain_details = json.load(file)
    else:
        chain_details = {}

    for chain_id in chain_ids:
        # Only fetch details if chain_id is not already in chainDetails.json
        # if chain_id not in chain_details:
        print(f"Fetching details for chain id {chain_id}...")
        details = get_chain_details(chain_id)

        # get icon
        if details:
            possible_chain_names = []
            if details.get("icon"):
                possible_chain_names.append(details["icon"])
            if details.get("short_name"):
                possible_chain_names.append(details["short_name"])
            if details.get("shortName"):
                possible_chain_names.append(details["shortName"])
            if details.get("name"):
                possible_chain_names.append(details["name"])
                # also split the name by spaces and add each word to the list
                possible_chain_names.extend(details["name"].split(" "))
            if details.get("chain"):
                possible_chain_names.append(details["chain"])
            possible_chain_names.extend([name.lower() for name in possible_chain_names])
            icon = get_chain_icon(possible_chain_names)
            details["icon"] = icon

            chain_details[chain_id] = details

        # wait 1 second between requests to avoid rate limiting
        time.sleep(1)

    with open(CHAIN_DETAILS_PATH, "w") as file:
        json.dump(chain_details, file)

    # also overwrite contracts.json with the latest version
    with open("contracts.json", "w") as file:
        json.dump(contracts, file)


# Call the function to start the process
main()
