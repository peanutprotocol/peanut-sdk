import requests
import json
import os

# Path to the local contracts.json file
CONTRACTS_PATH = "contracts.json"

# URLs to the GitHub chains and icons repositories
CHAINS_URL = (
    "https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains"
)
ICONS_URL = "https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons"


def get_chain_ids():
    with open(CONTRACTS_PATH, "r") as file:
        contracts = json.load(file)
    return list(contracts.keys())


def get_chain_details(chain_id):
    chain_file = f"eip155-{chain_id}.json"
    response = requests.get(os.path.join(CHAINS_URL, chain_file))
    if response.status_code == 200:
        return response.json()
    return None


def get_chain_icon(icon_name):
    icon_file = f"{icon_name}.json"
    response = requests.get(os.path.join(ICONS_URL, icon_file))
    if response.status_code == 200:
        return response.json()
    return None


def combine_details():
    chain_ids = get_chain_ids()
    chain_details = {}

    for chain_id in chain_ids:
        details = get_chain_details(chain_id)
        if details:
            icon_name = details.get("icon")
            if icon_name:
                icon = get_chain_icon(icon_name)
                if icon:
                    details["icon"] = icon
            chain_details[chain_id] = details

    with open("chainDetails.json", "w") as file:
        json.dump(chain_details, file, indent=4)


# Call the function to start the process
combine_details()
