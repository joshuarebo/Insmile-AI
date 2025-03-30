import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { scans } from '../services/api';

interface Scan {
  id: string;
  patientId: string;
  filename: string;
  createdAt: string;
  analysis?: {
    findings: string[];
    recommendations: string[];
    confidence: number;
  };
}

const ScanDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { data: scan } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => scans.getById(id!),
    enabled: !!id,
  });

  if (!scan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading scan details...</div>
      </div>
    );
  }

  const typedScan = scan as Scan;

  return (
    <div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Scan Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {typedScan.filename}
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Patient ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {typedScan.patientId}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(typedScan.createdAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {typedScan.analysis ? (
        <div className="mt-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Analysis Results
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Confidence Score: {(typedScan.analysis.confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Findings
                </h4>
                <ul className="list-disc pl-5 space-y-2">
                  {typedScan.analysis.findings.map((finding: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700">
                      {finding}
                    </li>
                  ))}
                </ul>

                <h4 className="text-md font-medium text-gray-900 mt-6 mb-4">
                  Recommendations
                </h4>
                <ul className="list-disc pl-5 space-y-2">
                  {typedScan.analysis.recommendations.map((recommendation: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700">
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-4">
          <p className="text-gray-500">This scan has not been analyzed yet.</p>
        </div>
      )}
    </div>
  );
};

export default ScanDetails; 