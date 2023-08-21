# v0.0.81

-   fixed excessive allowance bug
-   now properly estimates correct gas limit, and adds 10% tolerance
-   set maxPriorityFeePerGas to 30 gwei on polygon to avoid stuck transactions
-   refactored some code & general code quality improvements
-   fix for goerli tokens in getLinkDetails
-   link parameteres now by default have a '#' in front to prevent server side attacks
-   claimLinkGasless now throws on fail
-   chainDetails now includes an url to an icon for each chain