'use client';

import { FileCode, Box, ArrowRight, Plus, Edit, Trash2 } from 'lucide-react';

interface MoveTransaction {
  hash: string;
  from: string;
  module_function?: string;  // "0x1::Token::mint"
  type_args?: string[];
  resource_changes?: {
    type: string;
    change: 'created' | 'modified' | 'deleted';
  }[];
  gas_used: number;
  fee: number;
  timestamp: number;
}

export function MoveTransactionDetails({ tx }: { tx: MoveTransaction }) {
  return (
    <div className="space-y-3">
      {/* Module Function */}
      {tx.module_function && (
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-start gap-2">
            <FileCode className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-purple-600 font-medium mb-1">Move Function Call</div>
              <div className="font-mono text-sm text-purple-900 break-all">
                {tx.module_function}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Arguments (Generics) */}
      {tx.type_args && tx.type_args.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Type Arguments:</div>
          <div className="flex flex-wrap gap-1">
            {tx.type_args.map((ty, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-mono rounded"
              >
                {ty}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resource Changes */}
      {tx.resource_changes && tx.resource_changes.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">State Changes:</div>
          <div className="space-y-1.5">
            {tx.resource_changes.map((change, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2 border border-gray-200"
              >
                {change.change === 'created' && (
                  <Plus className="w-3.5 h-3.5 text-green-600" />
                )}
                {change.change === 'modified' && (
                  <Edit className="w-3.5 h-3.5 text-blue-600" />
                )}
                {change.change === 'deleted' && (
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                )}
                <div className="flex-1">
                  <span className="text-xs text-gray-600 capitalize">{change.change}:</span>
                  <span className="text-xs font-mono text-gray-900 ml-1">{change.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gas Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
        <span>Move Gas: {tx.gas_used?.toLocaleString()}</span>
        <span>Fee: {tx.fee} RAIN</span>
      </div>
    </div>
  );
}

// Compact version for lists
export function MoveTransactionBadge({ tx }: { tx: MoveTransaction }) {
  const moduleName = tx.module_function?.split('::')[1] || 'Module';
  const functionName = tx.module_function?.split('::')[2] || 'Call';

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      <FileCode className="w-3 h-3 text-purple-600" />
      <span className="font-mono text-purple-900">
        {moduleName}::{functionName}
      </span>
    </div>
  );
}
