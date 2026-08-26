from pydantic import BaseModel



class TransferAdminDTO(BaseModel):
    new_admin_address: str
    transaction_hash: str