import { utils } from 'ethersv5'
import { randomBytes } from 'crypto'

export function makeRandomAddress(): string {
	return utils.hexlify(randomBytes(20))
}
