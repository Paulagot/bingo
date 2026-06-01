// client/src/components/common/ConfirmArchiveModal.tsx
import React from 'react';
import { Archive, X } from 'lucide-react';

interface ConfirmArchiveModalProps {
  isOpen: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isArchiving?: boolean;
}

const ConfirmArchiveModal: React.FC<ConfirmArchiveModalProps> = ({
  isOpen,
  itemName,
  onConfirm,
  onCancel,
  isArchiving = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Archive className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Archive Supporter</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isArchiving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            This supporter has existing records and cannot be deleted.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Archive <span className="font-semibold">"{itemName}"</span> instead?
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Archived supporters will be hidden from the main view but can be restored later.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            You can unarchive this supporter at any time from the archived supporters view.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isArchiving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isArchiving}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isArchiving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Archiving...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Archive Supporter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmArchiveModal;