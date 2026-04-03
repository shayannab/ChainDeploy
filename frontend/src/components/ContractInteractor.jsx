import { useState } from 'react'
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseAbi, formatEther, parseEther } from 'viem'
import { Play, Loader2, Search, Zap, Info, ChevronRight, Activity, Terminal, Copy } from 'lucide-react'

// --- Function Item Component ---
function ContractFunction({ func, contractAddress, abi, isSimulator }) {
  const [args, setArgs] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const isRead = func.stateMutability === 'view' || func.stateMutability === 'pure'
  
  const parsedAbi = JSON.parse(abi)

  // Wagmi Hooks
  const { data: readData, isLoading: readLoading, refetch: readRefetch, error: readError } = useReadContract({
    address: contractAddress,
    abi: parsedAbi,
    functionName: func.name,
    args: func.inputs.map(i => {
        const val = args[i.name] || ''
        if (i.type.includes('int') && val) return BigInt(val)
        if (i.type === 'bool') return val === 'true'
        return val
    }),
    query: {
        enabled: false, // Don't run automatically
    }
  })

  const { writeContract, data: hash, isPending: writeLoading, error: writeError } = useWriteContract()
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash })

  const handleRun = async () => {
    setError(null)
    setResult(null)
    
    // Convert args based on type
    const processedArgs = func.inputs.map(input => {
        const val = args[input.name]
        try {
            if (input.type.includes('int')) return BigInt(val)
            if (input.type === 'bool') return val === 'true'
            return val
        } catch (e) { return val }
    })

    if (isRead) {
        try {
            const { data } = await readRefetch()
            setResult(data)
        } catch (err) { setError(err.message) }
    } else {
        try {
            writeContract({
                address: contractAddress,
                abi: parsedAbi,
                functionName: func.name,
                args: processedArgs,
            })
        } catch (err) { setError(err.message) }
    }
  }

  const isLoading = readLoading || writeLoading || txLoading
  const currentError = readError || writeError || (error ? { message: error } : null)

  return (
    <div className={`function-item ${isRead ? 'read' : 'write'}`}>
      <div className="function-header">
        <div className="function-label">
          <span className={`method-badge ${isRead ? 'badge-blue' : 'badge-orange'}`}>
            {isRead ? 'READ' : 'WRITE'}
          </span>
          <span className="function-name">{func.name}</span>
        </div>
        <button 
          className={`btn-run ${isRead ? 'btn-run-blue' : 'btn-run-orange'}`} 
          onClick={handleRun}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
          <span>Run</span>
        </button>
      </div>

      <div className="function-inputs">
        {func.inputs.length === 0 && <p className="no-inputs">No parameters required.</p>}
        {func.inputs.map((input, idx) => (
          <div key={idx} className="input-group-v2">
            <label>{input.name || `param${idx}`} <span className="type-meta">{input.type}</span></label>
            <input 
              type="text" 
              placeholder={`Enter ${input.type}...`}
              value={args[input.name || idx] || ''}
              onChange={e => setArgs({...args, [input.name || idx]: e.target.value})}
            />
          </div>
        ))}
      </div>

      {(result !== null || (readData !== undefined && readData !== null) || txSuccess || currentError) && (
        <div className="function-output">
          <div className="output-label">
            <Terminal size={12} /> Result
            {(result !== null || readData !== undefined) && (
                <button className="util-btn-sm" onClick={() => navigator.clipboard.writeText(String(result || readData))}><Copy size={10} /></button>
            )}
          </div>
          <div className="output-content">
            {currentError ? (
              <span className="text-error">{currentError.shortMessage || currentError.message}</span>
            ) : txSuccess ? (
              <span className="text-success">
                Transaction Successful! <br/>
                <small style={{ opacity: 0.7 }}>Hash: {hash.slice(0,10)}...{hash.slice(-6)}</small>
              </span>
            ) : (
                <span className="text-primary-v2">
                    {typeof (result ?? readData) === 'object' ? JSON.stringify(result ?? readData, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) : String(result ?? readData)}
                </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContractInteractor({ deployment }) {
  const { abi, contract_address: address, rpc_port, deploy_type } = deployment
  const [filter, setFilter] = useState('')
  const [view, setView] = useState('all') // all, read, write
  const { isConnected } = useAccount()

  if (!abi || !address) {
    return (
      <div className="interactor-empty">
        <Info size={32} />
        <p>No ABI found. This project might not be a compiled smart contract, or compilation failed.</p>
      </div>
    )
  }

  let parsedAbi = []
  try {
    parsedAbi = JSON.parse(abi).filter(item => item.type === 'function')
  } catch (e) {
    return <div className="text-error">Error parsing ABI JSON</div>
  }

  const filteredFunctions = parsedAbi.filter(f => {
    const matchesFilter = f.name.toLowerCase().includes(filter.toLowerCase())
    const isView = f.stateMutability === 'view' || f.stateMutability === 'pure'
    const matchesView = view === 'all' || (view === 'read' ? isView : !isView)
    return matchesFilter && matchesView
  })

  return (
    <div className="contract-interactor">
      <div className="interactor-controls">
        <div className="search-bar-v2">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search functions..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="view-selector">
          <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All</button>
          <button className={view === 'read' ? 'active' : ''} onClick={() => setView('read')}>Read</button>
          <button className={view === 'write' ? 'active' : ''} onClick={() => setView('write')}>Write</button>
        </div>
      </div>

      {!isConnected && (
        <div className="interactor-warning">
            <Activity size={16} />
            Connect your wallet to interact with Write functions.
        </div>
      )}

      <div className="functions-list">
        {filteredFunctions.length === 0 && <div className="empty-results">No functions found matching filters.</div>}
        {filteredFunctions.map((func, i) => (
          <ContractFunction 
            key={`${func.name}-${i}`} 
            func={func} 
            contractAddress={address} 
            abi={abi} 
            isSimulator={deploy_type === 'QIE Fork'}
          />
        ))}
      </div>
      
      <style>{`
        .contract-interactor {
            color: var(--text-primary);
        }
        .interactor-controls {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
        }
        .search-bar-v2 {
            flex: 1;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            display: flex;
            align-items: center;
            padding: 4px 12px;
            gap: 8px;
        }
        .search-bar-v2 input {
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 0.9rem;
            width: 100%;
            outline: none;
        }
        .view-selector {
            display: flex;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 4px;
            gap: 4px;
        }
        .view-selector button {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 6px 16px;
            border-radius: 8px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .view-selector button.active {
            background: var(--bg-card);
            color: var(--primary);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .function-item {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 16px;
            margin-bottom: 16px;
            overflow: hidden;
            transition: all 0.2s ease;
        }
        .function-item:hover {
            border-color: var(--primary);
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.05);
        }
        .function-header {
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
        }
        .function-label {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .method-badge {
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }
        .badge-blue { background: rgba(0, 242, 255, 0.1); color: #00f2ff; }
        .badge-orange { background: rgba(255, 145, 0, 0.1); color: #ff9100; }
        .function-name {
            font-family: var(--font-mono);
            font-weight: 600;
            color: var(--text-primary);
        }
        .btn-run {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        .btn-run:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }
        .btn-run:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-run-blue { background: var(--primary); color: #000; }
        .btn-run-orange { background: #ff9100; color: #000; }

        .function-inputs {
            padding: 16px;
            display: grid;
            gap: 12px;
        }
        .input-group-v2 label {
            display: block;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 4px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .type-meta {
            color: var(--primary);
            font-size: 0.7rem;
            margin-left: 4px;
            opacity: 0.8;
            font-weight: normal;
        }
        .input-group-v2 input {
            width: 100%;
            background: var(--bg-card);
            border: 1px solid var(--border);
            padding: 10px 14px;
            border-radius: 10px;
            color: var(--text-primary);
            font-size: 0.85rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .input-group-v2 input:focus { border-color: var(--primary); }
        .function-output {
            padding: 12px 16px;
            background: rgba(0,0,0,0.3);
            border-top: 1px solid var(--border);
        }
        .output-label {
            font-size: 0.7rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .output-content {
            font-family: var(--font-mono);
            font-size: 0.85rem;
            word-break: break-all;
            padding: 8px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
        }
        .text-error { color: #ff4d4d; }
        .text-success { color: #00f2ff; }
        .text-primary-v2 { color: var(--primary); }
        .no-inputs { font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin: 0; }
        .interactor-warning {
            background: rgba(255, 145, 0, 0.1);
            border: 1px solid rgba(255, 145, 0, 0.2);
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 0.8rem;
            color: #ff9100;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 24px;
        }
        .interactor-empty {
            text-align: center;
            padding: 60px;
            color: var(--text-muted);
        }
        .empty-results {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
            border: 1px dashed var(--border);
            border-radius: 16px;
        }
      `}</style>
    </div>
  )
}
