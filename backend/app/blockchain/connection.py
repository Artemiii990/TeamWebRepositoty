import json
import os
from web3 import Web3
from dotenv import load_dotenv





load_dotenv()


w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
if not w3.is_connected():
    w3 = None



with open("app/blockchain/abi/CryptoPaymentGateway.json") as file:
    abi = json.load()


contract = w3.eth.contract(address=Web3.to_checksum_address(os.getenv("CONTRACT_ADDRESS")), abi=abi["abi"])