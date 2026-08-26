from pydantic import BaseModel



class RegisterUserDTO(BaseModel):
    transaction_hash: str