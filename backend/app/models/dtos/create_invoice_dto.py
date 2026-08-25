from pydantic import BaseModel, Field



class CreateInvoiceDTO(BaseModel):
    merchant: str
    customer: str

    description: str
    amount: int = Field(gt=0)