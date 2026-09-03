import { useEffect, useMemo, useState } from "react";
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

const API_URL = "https://revenue-recovery-causal-lab.onrender.com";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "agent", label: "Recovery Agent" },
  { id: "recommendations", label: "Recommendations" },
  { id: "analytics", label: "Analytics" },
  { id: "audit", label: "Audit Trail" },
];

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatText(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLatestAuditEvents(events) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const latestByPayment = new Map();

  sorted.forEach((event) => {
    latestByPayment.set(event.payment_id, event);
  });

  return Array.from(latestByPayment.values()).reverse().slice(0, 20);
}

function App() {
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [audit, setAudit] = useState([]);

  const [paymentId, setPaymentId] = useState("P06136");
  const [execution, setExecution] = useState(null);
  const [loadingExecution, setLoadingExecution] = useState(false);

  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const loadDashboard = async () => {
    try {
      const [summaryRes, metricsRes, recommendationsRes, auditRes] =
        await Promise.all([
          axios.get(`${API_URL}/api/recovery/summary`),
          axios.get(`${API_URL}/api/recovery/metrics`),
          axios.get(`${API_URL}/api/recovery/recommendations`),
          axios.get(`${API_URL}/api/recovery/audit`),
        ]);

      setSummary(summaryRes.data);
      setMetrics(metricsRes.data);
      setRecommendations(recommendationsRes.data);
      setAudit(getLatestAuditEvents(auditRes.data));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the recovery backend.");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const executeRecovery = async () => {
    const id = paymentId.trim().toUpperCase();

    if (!id) return;

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
          err.response?.data?.detail || "Recovery execution failed.",
      });
    } finally {
      setLoadingExecution(false);
    }
  };

  const selectedPayment = useMemo(() => {
    return (
      recommendations.find(
        (payment) =>
          String(payment.payment_id).toUpperCase() ===
          paymentId.toUpperCase()
      ) ||
      recommendations[0] ||
      null
    );
  }, [recommendations, paymentId]);

  const navigateTo = (section) => {
    setActiveSection(section);
    setExecution(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const choosePayment = (id) => {
    setPaymentId(id);
    setExecution(null);
    setActiveSection("agent");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="state-screen">
        <div className="state-card error-card">
          <span className="eyebrow">SYSTEM STATUS</span>

          <h2>Backend connection failed</h2>

          <p>{error}</p>

          <p>Make sure FastAPI is running on port 8000.</p>

          <button onClick={loadDashboard}>Retry connection</button>
        </div>
      </div>
    );
  }

  if (!summary || !metrics) {
    return (
      <div className="state-screen">
        <div className="loading-card">
          <div className="loader"></div>

          <span>Loading recovery intelligence...</span>
        </div>
      </div>
    );
  }

  const totalPayments = Number(summary.total_payments) || 0;

  const targeted =
    Number(summary.payments_recommended_for_retry) || 0;

  const notTargeted =
    Number(summary.payments_not_recommended_for_retry) || 0;

  const protectedRate =
    Number(summary.protected_percentage) || 0;

  const averageUplift =
    Number(summary.average_uplift) || 0;

  const treatmentRate =
    Number(summary.treatment_recovery_rate) || 0;

  const controlRate =
    Number(summary.control_recovery_rate) || 0;

  const treatmentEffect =
    Number(summary.observed_treatment_effect) || 0;

  const recoveryRate =
    Number(metrics.execution_recovery_rate || 0) * 100;

  const recommendationData = [
    {
      name: "Retry",
      payments: targeted,
    },
    {
      name: "Do Not Retry",
      payments: notTargeted,
    },
  ];

  const upliftSegments = summary.uplift_segments || {};

  const upliftData = [
    {
      name: "Negative",
      payments: upliftSegments.negative || 0,
    },
    {
      name: "0–5%",
      payments: upliftSegments.zero_to_five || 0,
    },
    {
      name: "5–10%",
      payments: upliftSegments.five_to_ten || 0,
    },
    {
      name: ">10%",
      payments: upliftSegments.above_ten || 0,
    },
  ];

  const causalData = [
    {
      name: "Without Retry",
      rate: controlRate,
    },
    {
      name: "With Retry",
      rate: treatmentRate,
    },
  ];

  const selectedUplift =
    Number(selectedPayment?.uplift || 0) * 100;

  const selectedWithRetry =
    Number(selectedPayment?.probability_with_retry || 0) * 100;

  const selectedWithoutRetry =
    Number(selectedPayment?.probability_without_retry || 0) * 100;

  const isAlreadyProcessed =
    execution?.status === "already_processed";

  const isRetry =
    execution?.decision === "retry";

  const executionTitle = () => {
    if (isAlreadyProcessed) {
      return "Payment already processed";
    }

    if (execution?.decision === "retry") {
      return "Recovery action executed";
    }

    return "Retry prevented";
  };

  const executionMessage = () => {
    if (isAlreadyProcessed) {
      return "This payment already has a terminal recovery state. No additional recovery action was executed.";
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

    return "Predicted causal uplift was below the 10% threshold, so the retry was prevented.";
  };

  return (
    <div className="app">

      {/* HEADER */}

      <header className="top-header">

        <div className="brand">

          <div className="brand-mark">
            R
          </div>

          <div>
            <div className="brand-name">
              Revenue Recovery
            </div>

            <div className="brand-subtitle">
              Causal Lab
            </div>
          </div>

        </div>

        <div className="header-center">

          <span className="header-title">
            AI Revenue Recovery Causal Lab
          </span>

          <span className="header-description">
            Causal decisioning for failed payment recovery
          </span>

        </div>

        <div className="connection-status">

          <span className="status-dot"></span>

          <span>
            API Connected
          </span>

        </div>

      </header>


      {/* NAVIGATION */}

      <nav className="navigation">

        <div className="nav-inner">

          {NAV_ITEMS.map((item) => (

            <button
              key={item.id}
              className={`nav-item ${
                activeSection === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigateTo(item.id)
              }
            >
              {item.label}
            </button>

          ))}

        </div>

      </nav>


      <main className="main-content">


        {/* DASHBOARD */}

        {activeSection === "dashboard" && (
          <>

            <section className="hero-card">

              <div className="hero-copy">

                <span className="eyebrow">
                  CAUSAL RECOVERY ENGINE
                </span>

                <h1>
                  Recover selectively,
                  <br />
                  not blindly.
                </h1>

                <p>
                  Estimate the incremental effect of a
                  retry before taking action. The policy
                  targets only payments with meaningful
                  predicted uplift.
                </p>

                <div className="hero-actions">

                  <button
                    className="primary-button"
                    onClick={() =>
                      navigateTo("agent")
                    }
                  >
                    Test a payment
                    <span>→</span>
                  </button>

                  <button
                    className="text-button"
                    onClick={() =>
                      navigateTo("analytics")
                    }
                  >
                    View recovery impact
                  </button>

                </div>

              </div>


              <div className="hero-decision">

                <div className="decision-label">
                  BATCH DECISION
                </div>

                <div className="decision-number">
                  {targeted.toLocaleString()}
                </div>

                <div className="decision-caption">
                  payments qualify for retry
                </div>

                <div className="decision-rule">

                  <span>
                    Policy threshold
                  </span>

                  <strong>
                    ≥ 10% uplift
                  </strong>

                </div>

              </div>

            </section>


            {/* TOP METRICS */}

            <section className="stat-grid">

              <div className="stat-card">

                <span className="stat-label">
                  Payments evaluated
                </span>

                <strong>
                  {totalPayments.toLocaleString()}
                </strong>

                <span className="stat-note">
                  Failed payments analyzed
                </span>

              </div>


              <div className="stat-card accent">

                <span className="stat-label">
                  Targeted interventions
                </span>

                <strong>
                  {targeted.toLocaleString()}
                </strong>

                <span className="stat-note">
                  Positive causal uplift ≥ 10%
                </span>

              </div>


              <div className="stat-card">

                <span className="stat-label">
                  Payments protected
                </span>

                <strong>
                  {notTargeted.toLocaleString()}
                </strong>

                <span className="stat-note">
                  {protectedRate.toFixed(2)}% not targeted
                </span>

              </div>


              <div className="stat-card revenue-card">

                <span className="stat-label">
                  Estimated incremental revenue
                </span>

                <strong>
                  {formatCurrency(
                    summary.estimated_incremental_revenue
                  )}
                </strong>

                <span className="stat-note">
                  Expected value from targeted retries
                </span>

              </div>

            </section>


            {/* CAUSAL COMPARISON */}

            <section className="decision-showcase">

              <div className="section-heading">

                <div>

                  <span className="eyebrow">
                    CAUSAL DECISION
                  </span>

                  <h2>
                    Measure what the retry actually changes.
                  </h2>

                </div>

                <span className="live-chip">
                  BATCH ANALYSIS
                </span>

              </div>


              <div className="causal-comparison">

                <div className="probability-block">

                  <span>
                    Without retry
                  </span>

                  <strong>
                    {formatPercent(controlRate)}
                  </strong>

                  <div className="progress-track">

                    <div
                      className="progress-fill muted"
                      style={{
                        width: `${Math.min(
                          controlRate,
                          100
                        )}%`,
                      }}
                    />

                  </div>

                  <small>
                    Control recovery rate
                  </small>

                </div>


                <div className="uplift-center">

                  <span>
                    OBSERVED EFFECT
                  </span>

                  <strong>
                    {treatmentEffect >= 0
                      ? "+"
                      : ""}
                    {treatmentEffect.toFixed(2)} pp
                  </strong>

                  <small>
                    incremental recovery impact
                  </small>

                </div>


                <div className="probability-block">

                  <span>
                    With retry
                  </span>

                  <strong>
                    {formatPercent(treatmentRate)}
                  </strong>

                  <div className="progress-track">

                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          treatmentRate,
                          100
                        )}%`,
                      }}
                    />

                  </div>

                  <small>
                    Treatment recovery rate
                  </small>

                </div>

              </div>

            </section>


            {/* DASHBOARD CHART + INSIGHT */}

            <section className="dashboard-grid">

              <div className="panel chart-panel">

                <div className="section-heading">

                  <div>

                    <span className="eyebrow">
                      INTERVENTION POLICY
                    </span>

                    <h2>
                      Recovery decisions
                    </h2>

                  </div>

                  <button
                    className="panel-link"
                    onClick={() =>
                      navigateTo("analytics")
                    }
                  >
                    Analytics →
                  </button>

                </div>


                <div className="chart-wrap">

                  <ResponsiveContainer
                    width="100%"
                    height={270}
                  >

                    <BarChart
                      data={recommendationData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        stroke="#e5eaf0"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 12,
                        }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        cursor={{
                          fill: "#f1f5f9",
                        }}
                        formatter={(value) => [
                          Number(value).toLocaleString(),
                          "Payments",
                        ]}
                      />

                      <Bar
                        dataKey="payments"
                        radius={[8, 8, 0, 0]}
                        fill="#16324f"
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </div>


              <div className="panel insight-card">

                <span className="eyebrow">
                  MODEL INSIGHT
                </span>

                <h2>
                  Average predicted uplift
                </h2>

                <div className="big-uplift">
                  {formatPercent(
                    averageUplift * 100
                  )}
                </div>

                <p>
                  Average predicted incremental
                  recovery effect across the evaluated
                  batch.
                </p>


                <div className="policy-box">

                  <span>
                    Intervention policy
                  </span>

                  <strong>
                    Retry only when uplift ≥ 10%
                  </strong>

                  <small>
                    The model recommends.
                    The policy decides.
                  </small>

                </div>

              </div>

            </section>


            {/* WORKFLOW */}

            <section className="workflow-panel panel">

              <div className="section-heading">

                <div>

                  <span className="eyebrow">
                    DECISION PIPELINE
                  </span>

                  <h2>
                    From failed payment to controlled recovery
                  </h2>

                </div>

              </div>


              <div className="workflow">

                <div className="workflow-step">

                  <span>01</span>

                  <strong>
                    Payment failure
                  </strong>

                  <p>
                    Identify a failed transaction.
                  </p>

                </div>


                <div className="workflow-line" />


                <div className="workflow-step">

                  <span>02</span>

                  <strong>
                    Predict outcomes
                  </strong>

                  <p>
                    Estimate recovery with and without retry.
                  </p>

                </div>


                <div className="workflow-line" />


                <div className="workflow-step highlight">

                  <span>03</span>

                  <strong>
                    Estimate uplift
                  </strong>

                  <p>
                    Measure the incremental effect of intervention.
                  </p>

                </div>


                <div className="workflow-line" />


                <div className="workflow-step">

                  <span>04</span>

                  <strong>
                    Policy gate
                  </strong>

                  <p>
                    Allow retry only above the threshold.
                  </p>

                </div>


                <div className="workflow-line" />


                <div className="workflow-step">

                  <span>05</span>

                  <strong>
                    Recover or review
                  </strong>

                  <p>
                    Close recovery or escalate failures.
                  </p>

                </div>

              </div>

            </section>

          </>
        )}


        {/* RECOVERY AGENT */}

        {activeSection === "agent" && (
          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">
                  CONTROLLED EXECUTION
                </span>

                <h1>
                  Recovery Agent
                </h1>

                <p>
                  Test a failed payment and see the
                  causal decision before executing a
                  recovery action.
                </p>

              </div>

              <span className="live-chip">
                LIVE POLICY
              </span>

            </section>


            <section className="agent-layout">

              <div className="panel agent-input-panel">

                <div className="agent-title">

                  <div className="payment-icon">
                    P
                  </div>

                  <div>

                    <span className="eyebrow">
                      PAYMENT INVESTIGATION
                    </span>

                    <h2>
                      Choose a failed payment
                    </h2>

                  </div>

                </div>


                <label>
                  Payment ID
                </label>


                <div className="input-row">

                  <input
                    value={paymentId}
                    onChange={(e) =>
                      setPaymentId(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="e.g. P06136"
                  />


                  <button
                    className="primary-button"
                    onClick={executeRecovery}
                    disabled={loadingExecution}
                  >
                    {loadingExecution
                      ? "Executing..."
                      : "Execute Recovery"}
                  </button>

                </div>


                <div className="demo-selector">

                  <span>
                    Demo payments
                  </span>

                  <div>

                    {[
                      "P06136",
                      "P03689",
                      "P05999",
                    ].map((id) => (

                      <button
                        key={id}
                        className={
                          paymentId === id
                            ? "demo-button selected"
                            : "demo-button"
                        }
                        onClick={() => {
                          setPaymentId(id);
                          setExecution(null);
                        }}
                      >
                        {id}
                      </button>

                    ))}

                  </div>

                </div>


                <div className="agent-note">

                  <strong>
                    What happens next?
                  </strong>

                  <span>
                    The policy evaluates predicted
                    causal uplift, applies the 10%
                    threshold, then either executes or
                    blocks the retry.
                  </span>

                </div>

              </div>


              {/* PAYMENT PREVIEW */}

              <div className="panel payment-preview">

                <span className="eyebrow">
                  SELECTED PAYMENT
                </span>


                {selectedPayment ? (
                  <>

                    <div className="payment-topline">

                      <strong>
                        {selectedPayment.payment_id}
                      </strong>

                      <span className="failed-badge">
                        FAILED
                      </span>

                    </div>


                    <div className="amount">
                      {formatCurrency(
                        selectedPayment.amount
                      )}
                    </div>


                    <div className="probability-list">

                      <div>

                        <span>
                          With retry
                        </span>

                        <strong>
                          {formatPercent(
                            selectedWithRetry
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Without retry
                        </span>

                        <strong>
                          {formatPercent(
                            selectedWithoutRetry
                          )}
                        </strong>

                      </div>

                    </div>


                    <div className="selected-uplift">

                      <span>
                        Predicted causal uplift
                      </span>

                      <strong
                        className={
                          selectedUplift >= 10
                            ? "positive"
                            : "negative"
                        }
                      >
                        {selectedUplift >= 0
                          ? "+"
                          : ""}
                        {selectedUplift.toFixed(2)}%
                      </strong>

                    </div>


                    <div
                      className={`recommendation-banner ${
                        selectedUplift >= 10
                          ? "retry-banner"
                          : "block-banner"
                      }`}
                    >

                      <span>
                        {selectedUplift >= 10
                          ? "RETRY RECOMMENDED"
                          : "DO NOT RETRY"}
                      </span>

                      <small>
                        {selectedUplift >= 10
                          ? "Payment crosses the 10% policy threshold."
                          : "Payment does not cross the 10% policy threshold."}
                      </small>

                    </div>

                  </>
                ) : (

                  <div className="empty-state">
                    Enter a payment ID to inspect
                    its recommendation.
                  </div>

                )}

              </div>

            </section>


            {/* EXECUTION RESULT */}

            {execution && (

              <section
                className={`execution-card ${
                  execution.error
                    ? "execution-error"
                    : isAlreadyProcessed
                    ? "execution-neutral"
                    : isRetry
                    ? "execution-recovered"
                    : "execution-blocked"
                }`}
              >

                {execution.error ? (

                  <>

                    <span className="eyebrow">
                      EXECUTION ERROR
                    </span>

                    <h2>
                      {execution.error}
                    </h2>

                  </>

                ) : (

                  <>

                    <div className="execution-top">

                      <div>

                        <span className="eyebrow">
                          RECOVERY OUTCOME
                        </span>

                        <h2>
                          {executionTitle()}
                        </h2>

                        <p>
                          {executionMessage()}
                        </p>

                      </div>


                      <div className="execution-status">

                        {isAlreadyProcessed
                          ? "ALREADY PROCESSED"
                          : execution.decision ===
                            "retry"
                          ? "RETRY"
                          : "DO NOT RETRY"}

                      </div>

                    </div>


                    <div className="execution-highlight">

                      <div>

                        <span>
                          Payment
                        </span>

                        <strong>
                          {execution.payment_id}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Predicted uplift
                        </span>

                        <strong>
                          {formatPercent(
                            Number(
                              execution.predicted_uplift ||
                                0
                            ) * 100
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Action
                        </span>

                        <strong>
                          {formatText(
                            execution.action
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Result
                        </span>

                        <strong>
                          {formatText(
                            execution.result
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Next action
                        </span>

                        <strong>
                          {formatText(
                            execution.next_action
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Attempt
                        </span>

                        <strong>
                          {execution.attempt_number ??
                            "-"}
                        </strong>

                      </div>

                    </div>


                    <div className="execution-footer">

                      <span>
                        Policy outcome
                      </span>

                      <strong>
                        {isAlreadyProcessed
                          ? "No new action executed because a terminal recovery state already exists."
                          : execution.stop_reason
                          ? formatText(
                              execution.stop_reason
                            )
                          : "Recovery policy completed."}
                      </strong>

                    </div>

                  </>

                )}

              </section>

            )}

          </>
        )}


        {/* RECOMMENDATIONS */}

        {activeSection === "recommendations" && (
          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">
                  TARGETING
                </span>

                <h1>
                  Payment Recommendations
                </h1>

                <p>
                  Payments where the model predicts
                  meaningful incremental benefit from retrying.
                </p>

              </div>


              <div className="heading-stat">

                <strong>
                  {targeted.toLocaleString()}
                </strong>

                <span>
                  retry candidates
                </span>

              </div>

            </section>


            <section className="panel table-panel">

              <div className="table-toolbar">

                <div>

                  <h2>
                    Highest-value recovery opportunities
                  </h2>

                  <p>
                    Sorted by predicted causal uplift.
                  </p>

                </div>


                <span className="threshold-chip">
                  Policy ≥ 10%
                </span>

              </div>


              <div className="table-scroll">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Payment
                      </th>

                      <th>
                        Amount
                      </th>

                      <th>
                        With retry
                      </th>

                      <th>
                        Without retry
                      </th>

                      <th>
                        Uplift
                      </th>

                      <th>
                        Expected incremental revenue
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {recommendations
                      .slice(0, 20)
                      .map((payment) => {

                        const uplift =
                          Number(
                            payment.uplift || 0
                          ) * 100;

                        return (

                          <tr
                            key={
                              payment.payment_id
                            }
                          >

                            <td>

                              <button
                                className="payment-link"
                                onClick={() =>
                                  choosePayment(
                                    payment.payment_id
                                  )
                                }
                              >
                                {payment.payment_id}
                              </button>

                            </td>


                            <td>
                              {formatCurrency(
                                payment.amount
                              )}
                            </td>


                            <td>
                              {formatPercent(
                                Number(
                                  payment.probability_with_retry ||
                                    0
                                ) * 100
                              )}
                            </td>


                            <td>
                              {formatPercent(
                                Number(
                                  payment.probability_without_retry ||
                                    0
                                ) * 100
                              )}
                            </td>


                            <td>

                              <strong className="uplift-value">

                                {uplift >= 0
                                  ? "+"
                                  : ""}

                                {uplift.toFixed(2)}%

                              </strong>

                            </td>


                            <td>
                              {formatCurrency(
                                payment.expected_incremental_revenue
                              )}
                            </td>


                            <td>

                              <span className="retry-pill">
                                RETRY
                              </span>

                            </td>

                          </tr>

                        );

                      })}

                  </tbody>

                </table>

              </div>

            </section>

          </>
        )}


        {/* ANALYTICS */}

        {activeSection === "analytics" && (
          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">
                  MEASURED IMPACT
                </span>

                <h1>
                  Recovery Analytics
                </h1>

                <p>
                  Compare treatment and control outcomes,
                  uplift segments, and executed recovery results.
                </p>

              </div>

            </section>


            <section className="impact-strip">

              <div>

                <span>
                  Treatment recovery
                </span>

                <strong>
                  {formatPercent(
                    treatmentRate
                  )}
                </strong>

              </div>


              <div className="impact-arrow">
                −
              </div>


              <div>

                <span>
                  Control recovery
                </span>

                <strong>
                  {formatPercent(
                    controlRate
                  )}
                </strong>

              </div>


              <div className="impact-result">

                <span>
                  Observed treatment effect
                </span>

                <strong>
                  {treatmentEffect >= 0
                    ? "+"
                    : ""}
                  {treatmentEffect.toFixed(2)} pp
                </strong>

              </div>

            </section>


            <section className="analytics-grid">

              <div className="panel chart-panel">

                <div className="section-heading">

                  <div>

                    <span className="eyebrow">
                      TREATMENT VS CONTROL
                    </span>

                    <h2>
                      Recovery impact
                    </h2>

                  </div>

                </div>


                <div className="chart-wrap">

                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >

                    <BarChart
                      data={causalData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        stroke="#e5eaf0"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 12,
                        }}
                      />

                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        cursor={{
                          fill: "#f1f5f9",
                        }}
                        formatter={(value) => [
                          `${Number(value).toFixed(2)}%`,
                          "Recovery rate",
                        ]}
                      />

                      <Bar
                        dataKey="rate"
                        radius={[9, 9, 0, 0]}
                        fill="#16324f"
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </div>


              <div className="panel chart-panel">

                <div className="section-heading">

                  <div>

                    <span className="eyebrow">
                      UPLIFT SEGMENTS
                    </span>

                    <h2>
                      Where intervention matters
                    </h2>

                  </div>

                </div>


                <div className="chart-wrap">

                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >

                    <BarChart
                      data={upliftData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        stroke="#e5eaf0"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 12,
                        }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        cursor={{
                          fill: "#f1f5f9",
                        }}
                        formatter={(value) => [
                          Number(value).toLocaleString(),
                          "Payments",
                        ]}
                      />

                      <Bar
                        dataKey="payments"
                        radius={[9, 9, 0, 0]}
                        fill="#6f879e"
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </div>

            </section>


            <section className="panel execution-panel">

              <div className="section-heading">

                <div>

                  <span className="eyebrow">
                    EXECUTION RESULTS
                  </span>

                  <h2>
                    Controlled recovery performance
                  </h2>

                </div>

              </div>


              <div className="execution-metrics">

                <div>

                  <span>
                    Interventions executed
                  </span>

                  <strong>
                    {Number(
                      metrics.interventions_executed || 0
                    ).toLocaleString()}
                  </strong>

                </div>


                <div>

                  <span>
                    Payments recovered
                  </span>

                  <strong>
                    {Number(
                      metrics.payments_recovered || 0
                    ).toLocaleString()}
                  </strong>

                </div>


                <div>

                  <span>
                    Recovered transaction value
                  </span>

                  <strong>
                    {formatCurrency(
                      metrics.recovered_revenue
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Execution recovery rate
                  </span>

                  <strong>
                    {recoveryRate.toFixed(1)}%
                  </strong>

                </div>


                <div>

                  <span>
                    Stopped by policy
                  </span>

                  <strong>
                    {Number(
                      metrics.stopped_by_policy || 0
                    ).toLocaleString()}
                  </strong>

                </div>

              </div>

            </section>

          </>
        )}


        {/* AUDIT */}

        {activeSection === "audit" && (
          <>

            <section className="page-heading">

              <div>

                <span className="eyebrow">
                  TRACEABILITY
                </span>

                <h1>
                  Recovery Audit Trail
                </h1>

                <p>
                  Review the latest decision and execution
                  state for each payment.
                </p>

              </div>


              <span className="audit-chip">
                AUDIT LOG
              </span>

            </section>


            <section className="panel table-panel">

              <div className="table-toolbar">

                <div>

                  <h2>
                    Latest payment decisions
                  </h2>

                  <p>
                    Terminal states prevent duplicate recovery actions.
                  </p>

                </div>

              </div>


              <div className="table-scroll">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Payment
                      </th>

                      <th>
                        Decision
                      </th>

                      <th>
                        Action
                      </th>

                      <th>
                        Result
                      </th>

                      <th>
                        Next action
                      </th>

                      <th>
                        Stop reason
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {audit.map(
                      (event, index) => (

                        <tr
                          key={`${event.payment_id}-${event.timestamp}-${index}`}
                        >

                          <td>

                            <button
                              className="payment-link"
                              onClick={() =>
                                choosePayment(
                                  event.payment_id
                                )
                              }
                            >
                              {event.payment_id}
                            </button>

                          </td>


                          <td>

                            <span
                              className={`decision-pill ${
                                event.decision ===
                                "retry"
                                  ? "retry"
                                  : "blocked"
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

          </>
        )}

      </main>


      {/* FOOTER */}

      <footer className="footer">

        <div>

          <strong>
            AI Revenue Recovery Causal Lab
          </strong>

          <span>
            FastAPI · React · Machine Learning
          </span>

        </div>

        <span>
          Simulation demo · Policy-controlled recovery
        </span>

      </footer>

    </div>
  );
}

export default App;