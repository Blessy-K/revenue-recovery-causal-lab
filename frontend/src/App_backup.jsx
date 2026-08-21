import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
  axios
    .get("http://127.0.0.1:8000/api/recovery/summary")
    .then((response) => {
      setSummary(response.data);
    })
    .catch((error) => {
      console.error("Summary API error:", error);
    });

  axios
    .get("http://127.0.0.1:8000/api/recovery/recommendations")
    .then((response) => {
      setRecommendations(response.data);
    })
    .catch((error) => {
      console.error("Recommendations API error:", error);
    });
}, []);

  if (error) {
    return (
      <div className="error-screen">
        <h2>Backend connection failed</h2>
        <p>{error}</p>
        <p>Make sure FastAPI is running on port 8000.</p>
      </div>
    );
  }

  if (!summary) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const recommendationData = [
    {
      name: "Retry",
      payments: summary.payments_recommended_for_retry,
    },
    {
      name: "Do Not Retry",
      payments: summary.payments_not_recommended_for_retry,
    },
  ];

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>AI Revenue Recovery Causal Lab</h1>
          <p>
            Causal AI-powered payment recovery and incremental revenue
            analysis
          </p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          API Connected
        </div>
      </header>

      <main>
        <section className="metrics">
          <div className="metric-card">
            <span>Total Payments</span>
            <strong>{summary.total_payments.toLocaleString()}</strong>
            <small>Analyzed payment failures</small>
          </div>

          <div className="metric-card">
            <span>Retry Recommended</span>
            <strong>{summary.payments_recommended_for_retry}</strong>
            <small>High positive causal uplift</small>
          </div>

          <div className="metric-card">
            <span>Do Not Retry</span>
            <strong>
              {summary.payments_not_recommended_for_retry.toLocaleString()}
            </strong>
            <small>Avoid unnecessary retries</small>
          </div>

          <div className="metric-card revenue">
            <span>Estimated Incremental Revenue</span>
            <strong>
              ₹{summary.estimated_incremental_revenue.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </strong>
            <small>Revenue attributable to targeted retries</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Recovery Recommendations</h2>
                <p>AI-generated retry decision distribution</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={recommendationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="payments" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel insight-panel">
            <h2>Causal Recovery Insight</h2>

            <div className="uplift-number">
              {(summary.average_uplift * 100).toFixed(2)}%
            </div>

            <h3>Average Predicted Uplift</h3>

            <p>
              The model estimates the difference in recovery probability
              between retrying a payment and not retrying it.
            </p>

            <div className="insight-box">
              <strong>Decision rule</strong>
              <p>
                Payments with predicted uplift of at least 10% are
                recommended for retry.
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>How the System Works</h2>
              <p>From failed payment to causal recovery decision</p>
            </div>
          </div>

          <div className="pipeline">
            <div className="pipeline-step">
              <span>01</span>
              <h3>Payment Failure</h3>
              <p>Identify failed transactions and customer context.</p>
            </div>

            <div className="arrow">→</div>

            <div className="pipeline-step">
              <span>02</span>
              <h3>Causal Prediction</h3>
              <p>Estimate recovery probability with and without retry.</p>
            </div>

            <div className="arrow">→</div>

            <div className="pipeline-step">
              <span>03</span>
              <h3>Uplift Analysis</h3>
              <p>Calculate the incremental effect of the intervention.</p>
            </div>

            <div className="arrow">→</div>

            <div className="pipeline-step">
              <span>04</span>
              <h3>Revenue Decision</h3>
              <p>Retry only payments where intervention is beneficial.</p>
            </div>
          </div>
        </section>
        <section className="recommendations-section">
  <h2>Payment Recommendations</h2>

  <p className="section-description">
    Payments with high positive causal uplift are recommended for retry.
  </p>

  <div className="table-container">
    <table>
      <thead>
        <tr>
          <th>Payment ID</th>
          <th>Amount</th>
          <th>Uplift</th>
          <th>Recommendation</th>
          <th>Expected Incremental Revenue</th>
        </tr>
      </thead>

      <tbody>
        {recommendations.slice(0, 20).map((payment) => (
          <tr key={payment.payment_id}>
            <td>{payment.payment_id}</td>

            <td>
              ₹{Number(payment.amount).toLocaleString("en-IN")}
            </td>

            <td>
              {(payment.uplift * 100).toFixed(2)}%
            </td>

            <td>
              <span className="retry-badge">
                Retry
              </span>
            </td>

            <td>
              ₹
              {Number(
                payment.expected_incremental_revenue
              ).toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
      </main>

      <footer>
        <p>AI Revenue Recovery Causal Lab • FastAPI + React + Machine Learning</p>
      </footer>
    </div>
  );
}

export default App;