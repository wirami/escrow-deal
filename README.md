# EscrowDeal

**Author:** Кырчикова Софья Михайловна

## Purpose of the Project

Design and implement a decentralized escrow mechanism that guarantees secure settlement between a **Seller** and a **Buyer** with the help of a trusted **Guarantor**.  The smart‑contract locks the payment until the guarantor confirms that the off‑chain asset (e.g. an apartment) has been properly transferred to the buyer.

## How It Works

1. **Deployment** – the contract is deployed once with immutable participants (seller, buyer, guarantor) and a fixed price in wei.
2. **Funding** – the buyer calls `deposit()` transferring the exact price. Funds stay inside the contract; state changes to **AwaitingConfirmation**.
3. **Asset Transfer (off‑chain)** – the seller signs the property over to the buyer (e.g. via a notary or land‑registry).
4. **Guarantor Decision**

   * **confirmTransfer()** – if the transfer is valid, the guarantor releases the funds to the seller → state **Completed**.
   * **refundBuyer()** – if the deal fails, the guarantor refunds the buyer → state **Cancelled**.
5. **Safety Nets** – before funding either participant may call `cancelBeforeFunding()`; after a final state (`Completed` / `Cancelled`) the contract is immutable.

### State Machine

[![State machine](https://mermaid.ink/img/pako:eNqFkk1PwzAMhv9K5NOGumlrG5rlgMSG4ITEgROUQ1jcLqJNqjQFyrT_TtbuQ0Ugcorf-H1sJ9nC2kgEDrUTDm-UyK0oJ-9hqolfzxcvZDK5ItcfQjml8wfRlqhdf_hDHCSujM6ULYVTRhNOJFamVm40Jq8tWTYt2r8RK6HXWBQoyXlxsu7UJWbG4m2jpTeNxkPIoGZHMmVVoDuSPKTPeLRC1xnavp27RvjYGfsfbdgXJxYz30g3za-kc_m93V_lQT5xDjIEkFslgTvbYAAl-qr7ELZ7QwpugyWmwP1WCvuWQqp33lMJ_WRMebRZ0-Qb4Jkoah81lTw_50m1qCXalWm0Ax5R1kGAb-HThzM6jVm8YDSic3oZ0gBa4PM4nDIWJfMwuWSUxskugK-u6mxKF8yn0SimLGJxmASAUvnp7_sP1f2r3TczMr-s?type=png)](https://mermaid.live/edit#pako:eNqFkk1PwzAMhv9K5NOGumlrG5rlgMSG4ITEgROUQ1jcLqJNqjQFyrT_TtbuQ0Ugcorf-H1sJ9nC2kgEDrUTDm-UyK0oJ-9hqolfzxcvZDK5ItcfQjml8wfRlqhdf_hDHCSujM6ULYVTRhNOJFamVm40Jq8tWTYt2r8RK6HXWBQoyXlxsu7UJWbG4m2jpTeNxkPIoGZHMmVVoDuSPKTPeLRC1xnavp27RvjYGfsfbdgXJxYz30g3za-kc_m93V_lQT5xDjIEkFslgTvbYAAl-qr7ELZ7QwpugyWmwP1WCvuWQqp33lMJ_WRMebRZ0-Qb4Jkoah81lTw_50m1qCXalWm0Ax5R1kGAb-HThzM6jVm8YDSic3oZ0gBa4PM4nDIWJfMwuWSUxskugK-u6mxKF8yn0SimLGJxmASAUvnp7_sP1f2r3TczMr-s)
