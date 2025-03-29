import { motion } from "framer-motion";

const features = [
  {
    icon: "fa-brain",
    title: "AI-Powered Diagnostics",
    description: "Upload dental images for instant analysis of cavities, fractures, and alignment issues with high confidence scores.",
    color: "primary"
  },
  {
    icon: "fa-clipboard-list",
    title: "Treatment Plans",
    description: "Generate comprehensive treatment plans with step-by-step procedures, timelines, and cost estimates.",
    color: "accent"
  },
  {
    icon: "fa-user-injured",
    title: "Patient Management",
    description: "Track patient history, treatment progress, and appointments with unique patient identifiers and timelines.",
    color: "green"
  },
  {
    icon: "fa-file-export",
    title: "Report Generation",
    description: "Export professional PDF reports for patients, referring dentists, and insurance providers with detailed findings.",
    color: "yellow"
  },
  {
    icon: "fa-chart-bar",
    title: "Analytics Dashboard",
    description: "Get insights into your practice with metrics on patient flow, treatment success rates, and token usage.",
    color: "purple"
  },
  {
    icon: "fa-shield-alt",
    title: "HIPAA Compliant",
    description: "Securely store and process patient data with enterprise-grade encryption and access controls.",
    color: "blue"
  }
];

export default function TreatmentPlanningFeatures() {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-neutral-800 mb-6">Key Features</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 mb-4 rounded-lg bg-${feature.color}-100 flex items-center justify-center text-${feature.color}-500`}>
              <i className={`fas ${feature.icon} text-xl`}></i>
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">{feature.title}</h3>
            <p className="text-neutral-600">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
