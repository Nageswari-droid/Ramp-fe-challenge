import { useCallback, useContext } from "react"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"
import { PaginatedResponse, SetTransactionApprovalParams, Transaction } from "src/utils/types"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const cacheKey = getCacheKey(endpoint, params)
        const cacheResponse = cache?.current.get(cacheKey)

        if (cacheResponse) {
          const data = JSON.parse(cacheResponse)
          return data as Promise<TData>
        }

        const result = await fakeFetch<TData>(endpoint, params)
        cache?.current.set(cacheKey, JSON.stringify(result))
        return result
      }),
    [cache, wrappedRequest]
  )

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> => {
      if (endpoint === "setTransactionApproval" && cache !== undefined) {
        let transactionApprovalParams = params as SetTransactionApprovalParams
        updateTransactionApprovalState(cache, transactionApprovalParams)
      }

      return wrappedRequest<TData>(async () => {
        const result = await fakeFetch<TData>(endpoint, params)
        return result
      })
    },
    [wrappedRequest, cache]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  return { fetchWithCache, fetchWithoutCache, clearCache, clearCacheByEndpoint, loading }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}

function updateTransactionApprovalState(
  cache: React.MutableRefObject<Map<string, string>>,
  params: {}
) {
  const cacheKeys = Array.from(cache.current.keys())
  let paginatedTransactionKey: (string | undefined)[] = []
  let transactionsByEmployeeKey:(string | undefined)[] = []

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
