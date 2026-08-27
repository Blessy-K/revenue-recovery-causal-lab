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
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [audit, setAudit] = useState([]);
  const [paymentId, setPaymentId] = useState("P06136");
  const [execution, setExecution] = useState(null);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const [error, setError] = useState("");

  const formatText = (value) => {
    if (!value) {
      return "-";
    }

    return String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getLatestAuditEvents = (events) => {
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    const latestByPayment = new Map();

    sortedEvents.forEach((event) => {
      latestByPayment.set(event.payment_id, event);
    });

    return Array.from(latestByPayment.values())
      .reverse()
      .slice(0, 15);
  };

  const loadDashboard = async () => {
    try {
      const [
        summaryRes,
        metricsRes,
        recommendationsRes,
        auditRes,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/recovery/summary`),
        axios.get(`${API_URL}/api/recovery/metrics`),
        axios.get(`${API_URL}/api/recovery/recommendations`),
        axios.get(`${API_URL}/api/recovery/audit`),
      ]);

      setSummary(summaryRes.data);
      setMetrics(metricsRes.data);
      setRecommendations(recommendationsRes.data);

      const latestEvents = getLatestAuditEvents(
        auditRes.data
      );

      setAudit(latestEvents);
      setError("");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the recovery backend."
      );
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const executeRecovery = async () => {
    const id = paymentId.trim().toUpperCase();

    if (!id) {
      return;
    }

    setLoadingExecution(true);
    setExecution(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/recovery/execute/${id}`
      );

      setExecution(response.data);

      await loadDashboard();
    } catch (err) {
      setExecution({
        error:
          err.response?.data?.detail ||
          "Recovery execution failed.",
      });
    } finally {
      setLoadingExecution(false);
    }
  };

  if (error) {
    return (
      <div className="error-screen">
        <h2>Backend connection failed</h2>

        <p>{error}</p>

        <p>
          Make sure FastAPI is running on port 8000.
        </p>
      </div>
    );
  }

  if (!summary || !metrics) {
    return (
      <div className="loading">
        Loading recovery intelligence...
      </div>
    );
  }

  const recommendationData = [
    {
      name: "Retry",
      payments:
        summary.payments_recommended_for_retry,
    },
    {
      name: "Do Not Retry",
      payments:
        summary.payments_not_recommended_for_retry,
    },
  ];

  const upliftSegments =
    summary.uplift_segments || {};

  const upliftData = [
    {
      name: "Negative",
      payments:
        upliftSegments.negative || 0,
    },
    {
      name: "0–5%",
      payments:
        upliftSegments.zero_to_five || 0,
    },
    {
      name: "5–10%",
      payments:
        upliftSegments.five_to_ten || 0,
    },
    {
      name: ">10%",
      payments:
        upliftSegments.above_ten || 0,
    },
  ];

  const withoutRetryRate =
    Number(summary.control_recovery_rate) || 0;

  const withRetryRate =
    Number(summary.treatment_recovery_rate) || 0;

  const treatmentEffect =
    Number(summary.observed_treatment_effect) || 0;

  const causalData = [
    {
      name: "Without Retry",
      rate: withoutRetryRate,
    },
    {
      name: "With Retry",
      rate: withRetryRate,
    },
  ];

  const protectedRate =
    Number(summary.protected_percentage) || 0;

  const recoveryRate =
    Number(metrics.execution_recovery_rate || 0) * 100;

  const isAlreadyProcessed =
    execution?.status === "already_processed";

  const isRetry =
    execution?.decision === "retry";

  const executionBadgeClass = isAlreadyProcessed
    ? "already-processed"
    : isRetry
    ? "retry"
    : "no-retry";

  const getExecutionTitle = () => {
    if (isAlreadyProcessed) {
      return "Payment Already Processed";
    }

    if (execution?.decision === "retry") {
      return "Recovery Retry Executed";
    }

    return "Retry Prevented";
  };

  const getExecutionMessage = () => {
    if (isAlreadyProcessed) {
      return "This payment already has a completed policy decision. No additional recovery action was executed.";
    }

    if (execution?.decision === "retry") {
      if (execution?.result === "recovered") {
        return "The policy approved the retry and the payment was successfully recovered.";
      }

      if (execution?.result === "failed") {
        return "The policy approved the retry, but recovery failed. The payment has been routed for manual review.";
      }

      return "The policy approved the retry based on positive predicted causal uplift.";
    }

    return "The predicted causal uplift was below the 10% threshold, so the retry was prevented.";
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>
            AI Revenue Recovery Causal Lab
          </h1>

          <p>
            Causal AI-powered payment recovery
            and incremental revenue optimization
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
            <span>Payments Evaluated</span>

            <strong>
              {summary.total_payments.toLocaleString()}
            </strong>

            <small>
              Failed payments analyzed
            </small>
          </div>

          <div className="metric-card">
            <span>
              Targeted Interventions
            </span>

            <strong>
              {summary.payments_recommended_for_retry.toLocaleString()}
            </strong>

            <small>
              Positive causal uplift ≥ 10%
            </small>
          </div>

          <div className="metric-card">
            <span>
              Payments Not Targeted
            </span>

            <strong>
              {summary.payments_not_recommended_for_retry.toLocaleString()}
            </strong>

            <small>
              {protectedRate.toFixed(2)}% not targeted
            </small>
          </div>

          <div className="metric-card revenue">
            <span>
              Estimated Incremental Revenue
            </span>

            <strong>
              ₹
              {Number(
                summary.estimated_incremental_revenue
              ).toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </strong>

            <small>
              Expected value from targeted retries
            </small>
          </div>
        </section>

        <section className="agent-section">
          <div className="section-header">
            <h2>Recovery Agent</h2>

            <p>
              Test the policy-controlled recovery
              decision for an individual payment.
            </p>
          </div>

          <div className="agent-controls">
            <input
              value={paymentId}
              onChange={(e) =>
                setPaymentId(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="Enter payment ID"
            />

            <button
              onClick={executeRecovery}
              disabled={loadingExecution}
            >
              {loadingExecution
                ? "Executing..."
                : "Execute Recovery"}
            </button>
          </div>

          <div className="demo-hints">
            <span>Try:</span>

            <button
              onClick={() => {
                setPaymentId("P06136");
                setExecution(null);
              }}
            >
              P06136
            </button>

            <button
              onClick={() => {
                setPaymentId("P03689");
                setExecution(null);
              }}
            >
              P03689
            </button>

            <button
              onClick={() => {
                setPaymentId("P05999");
                setExecution(null);
              }}
            >
              P05999
            </button>
          </div>

          {execution && (
            <div
              className={`execution-result ${
                execution.error
                  ? "execution-error"
                  : isAlreadyProcessed
                  ? "execution-already-processed"
                  : execution.decision === "retry"
                  ? "execution-success"
                  : "execution-blocked"
              }`}
            >
              {execution.error ? (
                <>
                  <div className="execution-title">
                    <h3>Execution Error</h3>
                  </div>

                  <p>
                    {execution.error}
                  </p>
                </>
              ) : (
                <>
                  <div className="execution-header">
                    <div>
                      <span>Payment</span>

                      <strong>
                        {execution.payment_id}
                      </strong>
                    </div>

                    <span
                      className={`decision-badge ${executionBadgeClass}`}
                    >
                      {isAlreadyProcessed
                        ? "ALREADY PROCESSED"
                        : execution.decision === "retry"
                        ? "RETRY"
                        : "DO NOT RETRY"}
                    </span>
                  </div>

                  <div className="execution-title">
                    <h3>
                      {getExecutionTitle()}
                    </h3>

                    <p>
                      {getExecutionMessage()}
                    </p>
                  </div>

                  <div className="execution-grid">
                    <div>
                      <span>
                        Predicted Uplift
                      </span>

                      <strong
                        className={
                          Number(
                            execution.predicted_uplift
                          ) >= 0.10
                            ? "uplift-high"
                            : "uplift-low"
                        }
                      >
                        {(
                          Number(
                            execution.predicted_uplift
                          ) * 100
                        ).toFixed(2)}
                        %
                      </strong>
                    </div>

                    <div>
                      <span>Decision</span>

                      <strong>
                        {formatText(
                          execution.decision
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Action</span>

                      <strong>
                        {formatText(
                          execution.action
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Result</span>

                      <strong>
                        {formatText(
                          execution.result
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Next Action
                      </span>

                      <strong>
                        {formatText(
                          execution.next_action
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Retry Attempt
                      </span>

                      <strong>
                        {execution.attempt_number}
                      </strong>
                    </div>
                  </div>

                  <div className="execution-message">
                    <strong>
                      Policy outcome
                    </strong>

                    <p>
                      {isAlreadyProcessed
                        ? "No new action was executed because this payment already has a terminal recovery state."
                        : execution.stop_reason
                        ? formatText(
                            execution.stop_reason
                          )
                        : "Recovery policy completed."}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Recovery Recommendations
                </h2>

                <p>
                  AI-generated intervention
                  distribution
                </p>
              </div>
            </div>

            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={recommendationData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="payments"
                  name="Payments"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel insight-panel">
            <h2>
              Causal Recovery Insight
            </h2>

            <div className="uplift-number">
              {(
                Number(summary.average_uplift) *
                100
              ).toFixed(2)}
              %
            </div>

            <h3>
              Average Predicted Uplift
            </h3>

            <p>
              Uplift estimates how much the retry
              intervention changes the probability
              of recovering a failed payment.
            </p>

            <div className="insight-box">
              <strong>
                Intervention Policy
              </strong>

              <p>
                Retry only when predicted causal
                uplift is at least 10%.
              </p>
            </div>
          </div>
        </section>

        <section className="chart-section">
          <div className="section-header">
            <h2>
              Treatment vs Control Recovery
            </h2>

            <p>
              Observed recovery rate with and
              without the retry intervention.
            </p>
          </div>

          <div className="chart-container">
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart data={causalData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="name" />

                <YAxis domain={[0, 100]} />

                <Tooltip
                  formatter={(value) =>
                    `${Number(value).toFixed(2)}%`
                  }
                />

                <Bar
                  dataKey="rate"
                  name="Recovery Rate"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="causal-effect">
            <strong>
              {treatmentEffect >= 0
                ? "+"
                : ""}
              {treatmentEffect.toFixed(2)}%
            </strong>

            <span>
              Observed treatment effect
            </span>
          </div>
        </section>

        <section className="chart-section">
          <div className="section-header">
            <h2>
              Uplift Segment Analysis
            </h2>

            <p>
              Distribution of payments by predicted
              causal uplift.
            </p>
          </div>

          <div className="chart-container">
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart data={upliftData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="payments"
                  name="Payments"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="segment-insight">
            <strong>
              {summary.payments_recommended_for_retry.toLocaleString()}{" "}
              payments
            </strong>

            <span>
              have predicted uplift above 10%
              and are eligible for retry.
            </span>
          </div>
        </section>

        <section className="model-section">
          <div className="section-header">
            <h2>
              Recovery Execution Metrics
            </h2>

            <p>
              Results from the policy-controlled
              recovery simulation.
            </p>
          </div>

          <div className="model-metrics">
            <div className="metric-box">
              <span>
                Targeted Interventions
              </span>

              <strong>
                {metrics.interventions_executed.toLocaleString()}
              </strong>
            </div>

            <div className="metric-box">
              <span>
                Payments Recovered
              </span>

              <strong>
                {metrics.payments_recovered.toLocaleString()}
              </strong>
            </div>

            <div className="metric-box">
              <span>
                Recovered Transaction Value
              </span>

              <strong>
                ₹
                {Number(
                  metrics.recovered_revenue
                ).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>

            <div className="metric-box">
              <span>
                Execution Recovery Rate
              </span>

              <strong>
                {recoveryRate.toFixed(1)}%
              </strong>
            </div>
          </div>

          <div className="execution-policy">
            <span>
              Policy stopped
            </span>

            <strong>
              {metrics.stopped_by_policy.toLocaleString()}
            </strong>

            <span>
              low-uplift retries
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                How the System Works
              </h2>

              <p>
                From failed payment to controlled
                recovery action
              </p>
            </div>
          </div>

          <div className="pipeline">
            <div className="pipeline-step">
              <span>01</span>

              <h3>
                Payment Failure
              </h3>

              <p>
                Identify failed transactions and
                customer context.
              </p>
            </div>

            <div className="arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>02</span>

              <h3>
                Causal Prediction
              </h3>

              <p>
                Estimate recovery probability
                with and without intervention.
              </p>
            </div>

            <div className="arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>03</span>

              <h3>
                Uplift Decision
              </h3>

              <p>
                Measure the incremental effect
                of retrying.
              </p>
            </div>

            <div className="arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>04</span>

              <h3>
                Policy Gate
              </h3>

              <p>
                Allow retry only when uplift
                crosses the threshold.
              </p>
            </div>

            <div className="arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>05</span>

              <h3>
                Recovery / Review
              </h3>

              <p>
                Close recovered payments or
                route failures to review.
              </p>
            </div>
          </div>
        </section>

        <section className="recommendations-section">
          <h2>
            Payment Recommendations
          </h2>

          <p className="section-description">
            Highest-value payments where the model
            predicts positive incremental benefit
            from retrying.
          </p>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>With Retry</th>
                  <th>Without Retry</th>
                  <th>Uplift</th>
                  <th>
                    Expected Incremental Revenue
                  </th>
                </tr>
              </thead>

              <tbody>
                {recommendations
                  .slice(0, 20)
                  .map((payment) => (
                    <tr
                      key={payment.payment_id}
                    >
                      <td>
                        {payment.payment_id}
                      </td>

                      <td>
                        ₹
                        {Number(
                          payment.amount
                        ).toLocaleString(
                          "en-IN",
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td>
                        {(
                          Number(
                            payment.probability_with_retry
                          ) * 100
                        ).toFixed(2)}
                        %
                      </td>

                      <td>
                        {(
                          Number(
                            payment.probability_without_retry
                          ) * 100
                        ).toFixed(2)}
                        %
                      </td>

                      <td>
                        <strong className="uplift-positive">
                          {(
                            Number(
                              payment.uplift
                            ) * 100
                          ).toFixed(2)}
                          %
                        </strong>
                      </td>

                      <td>
                        ₹
                        {Number(
                          payment.expected_incremental_revenue
                        ).toLocaleString(
                          "en-IN",
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="recommendations-section">
          <h2>
            Recovery Audit Trail
          </h2>

          <p className="section-description">
            Latest policy decision for each payment,
            recorded for traceability.
          </p>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Decision</th>
                  <th>Action</th>
                  <th>Result</th>
                  <th>Next Action</th>
                  <th>Stop Reason</th>
                </tr>
              </thead>

              <tbody>
                {audit.map(
                  (event, index) => (
                    <tr
                      key={`${event.payment_id}-${event.timestamp}-${index}`}
                    >
                      <td>
                        {event.payment_id}
                      </td>

                      <td>
                        <span
                          className={`decision-badge ${
                            event.decision ===
                            "retry"
                              ? "retry"
                              : "no-retry"
                          }`}
                        >
                          {formatText(
                            event.decision
                          )}
                        </span>
                      </td>

                      <td>
                        {formatText(
                          event.action
                        )}
                      </td>

                      <td>
                        {formatText(
                          event.result
                        )}
                      </td>

                      <td>
                        {formatText(
                          event.next_action
                        )}
                      </td>

                      <td>
                        {formatText(
                          event.stop_reason
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer>
        <p>
          AI Revenue Recovery Causal Lab •
          FastAPI + React + Machine Learning
        </p>
      </footer>
    </div>
  );
}

export default App;