from pydantic import BaseModel



class BlockchainTransactionDTO(BaseModel):
    transaction_hash: str