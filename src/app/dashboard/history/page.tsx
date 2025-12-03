
import HistoryComponent from "../../components/HistoryComponent";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-primary-900">Historial de Operaciones</h1>
                <p className="text-secondary-600">Registro completo de actividades administrativas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HistoryComponent />
    </div>
  );
}
