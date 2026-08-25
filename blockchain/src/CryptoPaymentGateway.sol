// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CryptoPaymentGateway {
    // Возможные статусы invoice
    enum InvoiceStatus {
        WAITING_PAYMENT, // Ожидает оплаты
        PAID, // Оплачен
        CONFIRMED // Подтверждён
    }

    // Структура invoice
    struct Invoice {
        uint256 invoiceId; // Уникальный ID invoice
        address payable merchant; // Адрес продавца
        address customer; // Адрес покупателя
        string description; // Описание товара или услуги
        uint256 amount; // Сумма оплаты в wei
        uint256 timestamp; // Время создания invoice
        InvoiceStatus status; // Текущий статус invoice
    }

    // =========================
    // Администратор
    // =========================

    // Адрес администратора / владельца контракта
    address public owner;

    // Состояние контракта: остановлен или работает
    bool public paused;

    // =========================
    // Invoice
    // =========================

    // ID следующего создаваемого invoice
    uint256 private nextInvoiceId = 1;

    // Хранилище invoice по их ID
    mapping(uint256 => Invoice) private invoices;

    // =========================
    // События
    // =========================

    // Вызывается при создании нового invoice
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    // Вызывается после оплаты invoice
    event InvoicePaid(
        uint256 indexed invoiceId,
        address indexed customer,
        uint256 amount
    );

    // Вызывается при остановке контракта
    event ContractPaused(address indexed admin);

    // Вызывается при возобновлении работы контракта
    event ContractUnpaused(address indexed admin);

    // =========================
    // Конструктор
    // =========================

    // При deployment создатель контракта становится администратором
    constructor() {
        owner = msg.sender;
    }

    // =========================
    // Модификаторы
    // =========================

    // Только администратор может выполнять функцию
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // Функция доступна только когда контракт не остановлен
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // =========================
    // Функции администратора
    // =========================

    // Остановить работу контракта
    function pause() external onlyOwner {
        paused = true;

        emit ContractPaused(msg.sender);
    }

    // Возобновить работу контракта
    function unpause() external onlyOwner {
        paused = false;

        emit ContractUnpaused(msg.sender);
    }

    // =========================
    // Функции продавца
    // =========================

    // Создание нового invoice
    function createInvoice(
        uint256 amount,
        string calldata description
    ) external whenNotPaused returns (uint256 invoiceId) {
        // Сумма должна быть больше нуля
        require(amount > 0, "Amount must be greater than zero");

        // Описание не должно быть пустым
        require(bytes(description).length > 0, "Description cannot be empty");

        // Получаем новый ID и увеличиваем счётчик
        invoiceId = nextInvoiceId++;

        // Создаём invoice и сохраняем его в blockchain
        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            merchant: payable(msg.sender),
            customer: address(0),
            amount: amount,
            description: description,
            timestamp: block.timestamp,
            status: InvoiceStatus.WAITING_PAYMENT
        });

        // Сообщаем blockchain о создании invoice
        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            amount,
            description,
            block.timestamp
        );
    }

    // =========================
    // Функции покупателя
    // =========================

    // Оплата invoice
    function payInvoice(uint256 invoiceId) external payable whenNotPaused {
        // Получаем invoice из blockchain
        Invoice storage invoice = invoices[invoiceId];

        // Проверяем существование invoice
        require(invoice.invoiceId != 0, "Invoice does not exist");

        // Invoice должен ожидать оплаты
        require(
            invoice.status == InvoiceStatus.WAITING_PAYMENT,
            "Invoice is not waiting for payment"
        );

        // Отправленная сумма должна точно совпадать
        // с суммой invoice
        require(msg.value == invoice.amount, "Incorrect payment amount");

        // Сохраняем адрес покупателя
        invoice.customer = msg.sender;

        // Меняем статус на PAID
        invoice.status = InvoiceStatus.PAID;

        // Отправляем ETH продавцу
        (bool success, ) = invoice.merchant.call{value: msg.value}("");

        // Проверяем успешность перевода
        require(success, "Payment transfer failed");

        // Сообщаем blockchain об оплате invoice
        emit InvoicePaid(invoiceId, msg.sender, msg.value);
    }

    // =========================
    // Функции просмотра
    // =========================

    // Получить информацию об invoice
    function getInvoice(
        uint256 invoiceId
    ) external view returns (Invoice memory) {
        // Проверяем существование invoice
        require(invoices[invoiceId].invoiceId != 0, "Invoice does not exist");

        return invoices[invoiceId];
    }
}
