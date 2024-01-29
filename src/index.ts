////////////////// Peanut Library ///////////////////////
//
//  The intent of this library is to provide a set of stable functions to interact
//  with Peanut Protocol. This library is compatible with ethers v5, and
//  supports both node and browser environments.
//
/////////////////////////////////////////////////////////

import * as utils from './advanced'
import * as config from './config'
import * as data from './data'
import * as functions from './basic'
import * as interfaces from './interfaces'
import * as consts from './consts'

utils.greeting()

export const peanut: any = {
	...utils,
	...config,
	...data,
	...functions,
	...interfaces,
	...consts,
}

export * from './advanced'
export * from './config'
export * from './data'
export * from './basic'
export * from './interfaces'
export * from './consts'

export default peanut
