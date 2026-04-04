export function IncognitoVerify({ isIncognito, status }: { isIncognito?: boolean | null; status?: "verifying" | "blocked" }) {
  if (isIncognito === null || status === "verifying") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-950 font-sans p-6">
        <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-6">Verifying Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-white font-sans p-10">
      <div className="max-w-lg w-full">
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h1 className="text-2xl font-medium text-zinc-800 mb-4">
            This site can’t be reached
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed mb-1">
            The connection was reset.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-zinc-600 text-sm">Try:</p>
          <ul className="list-disc ml-6 text-zinc-600 text-sm space-y-2">
            <li>Checking the connection</li>
            <li>Checking the proxy and the firewall</li>
          </ul>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-200">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-tight">
            ERR_CONNECTION_RESET
          </p>
        </div>
      </div>
    </div>
  );
}
