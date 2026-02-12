// src/components/Quiz/tickets/PaymentMethodSelector.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, CreditCard, Smartphone, Building2 } from 'lucide-react';
import type { ClubPaymentMethod } from './types';

interface PaymentMethodSelectorProps {
  paymentMethods: ClubPaymentMethod[];
  onSelect: (method: ClubPaymentMethod) => void;
  onBack: () => void;
}

const getProviderIcon = (providerName: string | null) => {
  if (!providerName) return <CreditCard className="h-6 w-6" />;
  
  switch (providerName.toLowerCase()) {
    case 'revolut':
      return <Smartphone className="h-6 w-6" />;
    case 'bank_transfer':
      return <Building2 className="h-6 w-6" />;
    default:
      return <CreditCard className="h-6 w-6" />;
  }
};

const getProviderColor = (providerName: string | null) => {
  if (!providerName) return 'from-indigo-500 to-purple-600';
  
  switch (providerName.toLowerCase()) {
    case 'revolut':
      return 'from-blue-500 to-indigo-600';
    case 'bank_transfer':
      return 'from-green-500 to-emerald-600';
    default:
      return 'from-indigo-500 to-purple-600';
  }
};

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethods,
  onSelect,
  onBack,
}) => {
  return (
    <div className="flex h-full max-h-[95vh] flex-col sm:max-h-[90vh]">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-green-600 to-emerald-600 p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-2xl sm:h-14 sm:w-14">
            💳
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Select Payment Method</h2>
            <p className="text-sm text-green-100 sm:text-base">Choose how you'd like to pay</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const icon = getProviderIcon(method.providerName);
            const gradient = getProviderColor(method.providerName);
            
            return (
              <button
                key={method.id}
                onClick={() => onSelect(method)}
                className="group w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-md`}>
                      {icon}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 sm:text-lg">
                        {method.methodLabel}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {method.providerName?.replace('_', ' ') || method.methodCategory}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-600" />
                </div>
              </button>
            );
          })}
        </div>
        
        {paymentMethods.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No Payment Methods</h3>
            <p className="text-sm text-gray-600">Please contact the host for payment options.</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t bg-white p-4 sm:p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 transition-colors hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to form</span>
        </button>
      </div>
    </div>
  );
};