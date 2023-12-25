import { PaginatedResponse, SetTransactionApprovalParams, Transaction } from "./types"

export function updateTransactionApprovalState(
  cache: React.MutableRefObject<Map<string, string>>,
  params: {}
) {
  const cacheKeys = Array.from(cache.current.keys())
  let paginatedTransactionKey: (string | undefined)[] = []
  let transactionsByEmployeeKey: (string | undefined)[] = []

  for (const key of cacheKeys) {
    if (key.match("paginatedTransactions") !== null || key.match("transactionsByEmployee")) {
      paginatedTransactionKey.push(key.match("paginatedTransactions")?.input)
      transactionsByEmployeeKey.push(key.match("transactionsByEmployee")?.input)
    }
  }

  updateCache(paginatedTransactionKey, cache, params, false)
  updateCache(transactionsByEmployeeKey, cache, params, true)
}

function updateCache(
  cacheKey: (string | undefined)[],
  cache: React.MutableRefObject<Map<string, string>>,
  params: {},
  isByEmployeeId: Boolean
) {
  cacheKey.forEach((key) => {
    if (key !== null && key !== undefined) {
      let cacheResponse = cache.current.get(key)
      if (cacheResponse !== undefined) {
        let data = JSON.parse(cacheResponse)
        let transactions = isByEmployeeId
          ? (data as Transaction[])
          : (data as PaginatedResponse<Transaction[]>).data
        if (transactions) {
          transactions.forEach((element) => {
            let transactionApprovalParams = params as SetTransactionApprovalParams
            if (transactionApprovalParams.transactionId === element.id) {
              element.approved = transactionApprovalParams.value
            }
          })
          cache.current.set(key, JSON.stringify(data))
        }
      }
    }
  })
}
