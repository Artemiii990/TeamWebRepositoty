import json
import os
from web3 import Web3
from dotenv import load_dotenv





load_dotenv()


w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
if not w3.is_connected():
    raise RuntimeError("Unable to connect to RPC")



with open("backend/app/blockchain/abi/CryptoPaymentGateway.json") as file:
    default_abi = json.load()

with open("backend/app/blockchain/abi/Admin.json") as file:
    admin_abi = json.load()

with open("backend/app/blockchain/abi/User.json") as file:
    user_abi = json.load()


default_contract = w3.eth.contract(address=Web3.to_checksum_address(os.getenv("DEFAULT_CONTRACT_ADDRESS")), abi=default_abi["abi"])
admin_contract = w3.eth.contract(address=Web3.to_checksum_address(os.getenv("ADMIN_CONTRACT_ADDRESS")), abi=admin_abi["abi"])
user_contract = w3.eth.contract(address=Web3.to_checksum_address(os.getenv("USER_CONTRACT_ADDRESS")), abi=user_abi["abi"])