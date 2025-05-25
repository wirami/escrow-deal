// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowDeal
 * @dev Smart contract for secure buyer-seller transactions with a guarantor.
 *      Money is blocked until the guarantor's confirmation,then transferred
 *      to the seller or returned to the buyer in case of cancellation.
 */
contract EscrowDeal {
    enum State {
        AwaitingPayment,
        AwaitingConfirmation,
        Completed,
        Cancelled
    }

    address public immutable seller;
    address public immutable buyer;
    address public immutable guarantor;
    uint256 public immutable price;

    State public state;

    event Deposited(address indexed buyer, uint256 amount);
    event Confirmed(address indexed guarantor);
    event Refunded(address indexed guarantor);
    event Cancelled(address indexed by);

    /**
     * @param _seller    seller address
     * @param _buyer     buyer address
     * @param _guarantor guarantor address
     * @param _price     transaction amount in wei
     */
    constructor(address _seller, address _buyer, address _guarantor, uint256 _price) {
        require(_seller != address(0) && _buyer != address(0) && _guarantor != address(0), "Zero address");
        require(_price > 0, "Price must be > 0");
        seller = _seller;
        buyer = _buyer;
        guarantor = _guarantor;
        price = _price;
        state = State.AwaitingPayment;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer");
        _;
    }

    modifier onlyGuarantor() {
        require(msg.sender == guarantor, "Only guarantor");
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Wrong state");
        _;
    }

    /// @notice Buyer deposits funds for the contract
    function deposit() external payable onlyBuyer inState(State.AwaitingPayment) {
        require(msg.value == price, "Incorrect amount");
        state = State.AwaitingConfirmation;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice The guarantor confirms the transfer of the asset by the seller
    function confirmTransfer() external onlyGuarantor inState(State.AwaitingConfirmation) {
        state = State.Completed;
        emit Confirmed(msg.sender);
        _safeTransfer(seller, address(this).balance);
    }

    /// @notice The guarantor returns the money to the buyer (e.g. if the deal falls through)
    function refundBuyer() external onlyGuarantor inState(State.AwaitingConfirmation) {
        state = State.Cancelled;
        emit Refunded(msg.sender);
        _safeTransfer(buyer, address(this).balance);
    }

    /// @notice The seller or buyer can cancel the transaction before funds are deposited
    function cancelBeforeFunding() external inState(State.AwaitingPayment) {
        require(msg.sender == seller || msg.sender == buyer, "Not a participant");
        state = State.Cancelled;
        emit Cancelled(msg.sender);
    }

    receive() external payable {
        revert("Use deposit()");
    }

    function _safeTransfer(address to, uint256 amount) private {
        (bool ok, ) = to.call{ value: amount }("");
        require(ok, "Transfer failed");
    }
}
