interface ToastNotificationProps {
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  };
  onClose: () => void;
}

export default function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  if (!toast.show) return null;

  return (
    <div className={`fixed top-4 sm:top-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 transition-all duration-300 ${
      toast.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`flex items-center p-3 sm:p-5 rounded-xl shadow-2xl w-full sm:min-w-96 sm:max-w-2xl ${
        toast.type === 'success' ? 'bg-green-50 border-2 border-green-300' :
        toast.type === 'error' ? 'bg-red-50 border-2 border-red-300' :
        'bg-blue-50 border-2 border-blue-300'
      }`}>
        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-3 sm:mr-4 ${
          toast.type === 'success' ? 'bg-green-100' :
          toast.type === 'error' ? 'bg-red-100' :
          'bg-blue-100'
        }`}>
          <span className="text-sm sm:text-lg">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
        </div>
        <div className="flex-1">
          <p className={`text-sm sm:text-base font-semibold ${
            toast.type === 'success' ? 'text-green-800' :
            toast.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`ml-3 sm:ml-4 text-lg sm:text-xl font-bold hover:scale-110 transition-transform ${
            toast.type === 'success' ? 'text-green-600 hover:text-green-800' :
            toast.type === 'error' ? 'text-red-600 hover:text-red-800' :
            'text-blue-600 hover:text-blue-800'
          }`}
        >
          ×
        </button>
      </div>
    </div>
  );
} 