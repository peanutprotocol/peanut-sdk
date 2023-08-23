import { BigNumberish } from "ethersv5";
import { JsonRpcProvider } from '@ethersproject/providers'

export type TxFeeOptions = {
    txOptions?: TxFeeOptions,
    provider?: JsonRpcProvider,
    eip1559?: boolean,
    maxFeePerGas?: BigNumberish | null,
    maxFeePerGasMultiplier?: number,
    gasLimit?: BigNumberish | null,
    gasPrice?: BigNumberish | null,
    gasPriceMultiplier?: number,
    maxPriorityFeePerGas?: BigNumberish | null,
    maxPriorityFeePerGasMultiplier?: number,
    verbose?: boolean,
    nonce?: number | null,
    value?: BigNumberish,
}