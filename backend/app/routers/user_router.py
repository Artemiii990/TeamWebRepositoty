from fastapi import APIRouter, HTTPException
from fastapi import Depends
from sqlalchemy.orm import Session
from datetime import datetime

from backend.postgre_sql.database import SessionLocal
from backend.postgre_sql.table import Invoices

from backend.app.blockchain.connection import contract
from backend.app.models.invoice import Invoice
from backend.app.models.dtos.create_invoice_dto import CreateInvoiceDTO
from backend.app.models.dtos.confirm_payment_dto import ConfirmPaymentDTO
from backend.app.models.dtos.register_blockchain import RegisterBlockchainInvoiceDTO
from backend.app.models.statuses import Statuses
from backend.app.blockchain.connection import w3





def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()



user_router = APIRouter(prefix="/user", tags=["User"])



@user_router.post("/createInvoice", response_model=Invoice)
async def create_invoice(data: CreateInvoiceDTO, db: Session = Depends(get_db)):
    invoice = Invoices(
        Merchant=data.merchant,
        Customer=data.customer,
        Description=data.description,
        Amount=data.amount,
        Timestamp=datetime.utcnow(),
        Status=Statuses.WAITING_PAYMENT,
        BlockchainInvoiceId=None,
        TransactionHash=None
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)


    return Invoice(
        invoice_id=invoice.Id,
        merchant=invoice.Merchant,
        customer=invoice.Customer,
        description=invoice.Description,
        amount=invoice.Amount,
        timestamp=invoice.Timestamp,
        status=invoice.Status,
        blockchain_invoice_id=None,
        transaction_hash=None
    )



@user_router.post("/invoice/{invoice_id}/synchronizeWithBlockchain")
async def register_blockchain(invoice_id: int, data: RegisterBlockchainInvoiceDTO, db: Session = Depends(get_db)):
    if w3 is None:
        raise HTTPException(status_code=400, detail="RPC error")


    invoice = db.query(Invoices).filter(Invoices.Id == invoice_id).first()

    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.BlockchainInvoiceId is not None:
        raise HTTPException(status_code=400, detail="Blockchain invoice already registered")


    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Transaction not found")

    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["from"].lower() != invoice.Merchant.lower():
        raise HTTPException(status_code=400, detail="Invalid seller")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != contract.address.lower():
        raise HTTPException(status_code=400, detail="Transaction was not sent to payment contract")


    events = contract.events.InvoiceCreated().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400, detail="InvoiceCreated event not found")

    event = events[0]

    blockchain_invoice_id = event["args"]["invoiceId"]
    merchant = event["args"]["merchant"]
    amount = event["args"]["amount"]
    description = event["args"]["description"]

    if merchant.lower() != invoice.Merchant.lower():
        raise HTTPException(status_code=400, detail="Wrong merchant")

    if amount != invoice.Amount:
        raise HTTPException(status_code=400, detail="Wrong amount")

    if description != invoice.Description:
        raise HTTPException(status_code=400, detail="Wrong description")


    invoice.BlockchainInvoiceId = blockchain_invoice_id

    db.commit()
    db.refresh(invoice)


    return {
        "invoice_id": invoice.Id,
        "blockchain_invoice_id": invoice.BlockchainInvoiceId,
        "status": invoice.Status,
        "transaction_hash": data.transaction_hash
    }



@user_router.post("/invoice/{invoice_id}/pay")
async def pay_invoice(invoice_id: int, data: ConfirmPaymentDTO, db: Session = Depends(get_db)):
    if w3 is None:
        raise HTTPException(status_code=400, detail="RPC error")

    
    invoice = db.query(Invoices).filter(Invoices.Id == invoice_id).first()

    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.BlockchainInvoiceId is None:
        raise HTTPException(status_code=400, detail="Invoice is not registered on blockchain")

    if invoice.Status == Statuses.PAID:
        return {
            "invoice_id": invoice.Id,
            "status": invoice.Status,
            "transaction_hash": invoice.TransactionHash
        }


    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["from"].lower() != invoice.Customer.lower():
        raise HTTPException(status_code=400, detail="Wrong transaction sender")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != contract.address.lower():
        raise HTTPException(status_code=400, detail="Transaction was not sent to payment contract")



    events = contract.events.InvoicePaid().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400, detail="InvoicePaid event not found")

    
    event = events[0]

    blockchain_invoice_id = event["args"]["invoiceId"]
    customer = event["args"]["customer"]
    amount = event["args"]["amount"]

    if blockchain_invoice_id != invoice.BlockchainInvoiceId:
        raise HTTPException(status_code=400, detail="Wrong invoice")

    if amount != invoice.Amount:
        raise HTTPException(status_code=400, detail="Wrong amount")

    if customer.lower() != invoice.Customer.lower():
        raise HTTPException(status_code=400,detail="Wrong customer")

    invoice.Status = Statuses.PAID
    invoice.TransactionHash = data.transaction_hash

    db.commit()
    db.refresh(invoice)


    return {
        "invoice_id": invoice_id,
        "status": invoice.Status,
        "transaction_hash": invoice.TransactionHash
    }



@user_router.get("/getInvoice/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoices).filter(Invoices.Id == invoice_id).first()

    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")


    return Invoice(
        invoice_id=invoice.Id,

        merchant=invoice.Merchant,
        customer=invoice.Customer,

        description=invoice.Description,
        amount=invoice.Amount,
        timestamp=invoice.Timestamp,
        status=invoice.Status,

        blockchain_invoice_id=invoice.BlockchainInvoiceId,
        transaction_hash=invoice.TransactionHash
    )