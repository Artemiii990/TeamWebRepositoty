from pydantic import BaseModel



class RegisterBlockchainInvoiceDTO(BaseModel):
    transaction_hash: str