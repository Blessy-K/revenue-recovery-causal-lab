Revenue Recovery Causal Lab



AI powered payment recovery and incremental revenue analysis system



Project Overview



Revenue Recovery Causal Lab is a machine learning based payment recovery system that helps identify which failed payments are actually worth retrying.



When a payment fails, retrying every failed payment is not always the best approach. Some customers may complete their payment later without any retry. If we simply count every recovered payment after a retry as successful recovery, we cannot know how much revenue was actually caused by the retry.



This project addresses that problem using treatment and control analysis, machine learning and causal uplift estimation.



The system estimates the probability of recovery when a payment is retried and compares it with the estimated probability of recovery without a retry. The difference between these two probabilities is used as the predicted uplift.



Based on the uplift, the system recommends retries only for payments where the expected benefit is high enough and estimates the incremental revenue that could be generated.



Problem



Traditional payment recovery systems often use simple retry rules. For example, they may retry every failed payment after a certain period.



The problem is that not every failed payment needs an intervention. Some customers would have completed the payment naturally.



Because of this, simply measuring the total number of recovered payments does not tell us the actual impact of the retry strategy.



The important question is:



How much additional recovery was actually caused by the retry?



Our Solution



The system treats a retry as an intervention and compares two possible outcomes for each payment.



The first is the probability that the payment will recover with a retry.



The second is the probability that the payment will recover without a retry.



The difference between these probabilities represents the predicted uplift.



If the predicted uplift is at least 10 percent, the system recommends retrying the payment.



This allows the system to focus recovery efforts on payments where the retry is expected to make a meaningful difference instead of retrying every failed payment.



How the System Works



The complete workflow is:



Failed payment data



Payment and customer features



Treatment and control analysis



Machine learning recovery prediction



Probability with retry



Probability without retry



Predicted causal uplift



Retry decision



Expected incremental revenue



Dashboard and API



For every payment, the system calculates:



Probability with retry



Probability without retry



Predicted uplift



Retry recommendation



Expected incremental revenue



Example



Suppose a payment has the following predictions:



Probability with retry: 62.5 percent



Probability without retry: 52.4 percent



Predicted uplift: 10.1 percent



Since the uplift is greater than our 10 percent threshold, the system recommends retrying this payment.



The expected incremental revenue is then estimated using the payment amount and predicted uplift.



Causal Approach



The project uses a treatment and control approach.



The treatment group represents payments where a retry was attempted.



The control group represents payments where no retry was attempted.



We first compare the actual recovery rates between these groups to understand the observed treatment effect.



The machine learning component then estimates recovery probabilities for individual payments under both retry and no-retry conditions.



Predicted uplift is calculated as:



Probability with retry minus probability without retry



This allows the system to make payment level decisions instead of applying the same retry strategy to every failed payment.



Machine Learning



The project uses Random Forest classification models for recovery prediction.



Payment and customer related features are used as inputs to the models.



Separate predictions are generated for the retry and no-retry scenarios.



The predicted probabilities are then compared to calculate uplift.



The current model is trained and evaluated using an 80 percent training split and a 20 percent testing split.



Current model results on the generated dataset are:



Accuracy: 55.45 percent



Precision: 51.35 percent



Recall: 47.81 percent



ROC AUC: 56.22 percent



These results are based on the generated dataset used for this prototype and are intended to demonstrate the working of the recovery and uplift approach.



Current Results



The current dataset contains 10,000 payment records.



Payments recommended for retry: 369



Payments not recommended for retry: 9,631



Average predicted uplift: 0.29 percent



Observed treatment effect: 5.68 percent



Estimated incremental revenue: Rs. 22,806.90



The 369 recommended payments are the payments for which the predicted uplift reaches at least the 10 percent retry threshold.



The estimated revenue is calculated from the predicted uplift and payment amount. It represents potential incremental revenue on the generated dataset and is not actual production revenue.



System Architecture



The project has three main parts.



Frontend



The frontend is built using React and Vite. It provides a dashboard where the recovery results and recommendations can be viewed.



Backend



The backend is built using Python and FastAPI. It provides APIs that expose the recovery analysis and prediction results to the frontend.



Machine Learning Pipeline



The machine learning pipeline is responsible for generating payment data, analyzing treatment and control recovery rates, training the recovery model and calculating predicted uplift.



The overall architecture is:



React Dashboard



connects to



FastAPI Backend



connects to



Recovery Service



connects to



Machine Learning and Prediction Pipeline



uses



Payment Dataset and Recovery Predictions



Technology Used



Frontend



React



Vite



JavaScript



Recharts



CSS



Backend



Python



FastAPI



Uvicorn



Pandas



NumPy



Scikit-learn



Machine Learning



Random Forest Classifier



One Hot Encoding



Treatment and Control Modeling



Causal Uplift Analysis



Project Structure



backend/app contains the FastAPI application and recovery service.



backend/ml contains the machine learning and analysis scripts.



data contains the generated payment dataset and recovery predictions.



frontend contains the React dashboard.



tests contains the backend API tests.



requirements.txt contains the Python dependencies.



README.md contains the project documentation.



Main Files



backend/app/main.py



Contains the FastAPI application and API endpoints.



backend/app/recovery\_service.py



Handles recovery prediction results and summary information used by the API.



backend/ml/generate\_data.py



Generates the payment dataset used for the project.



backend/ml/analyze\_recovery.py



Analyzes recovery rates between treatment and control groups.



backend/ml/train\_model.py



Trains and evaluates the Random Forest recovery model.



backend/ml/causal\_model.py



Calculates predicted recovery probabilities, uplift, retry recommendations and expected incremental revenue.



API



The backend provides the following endpoints.



GET /



Returns the API status.



GET /health



Checks whether the backend is running.



GET /api/recovery/summary



Returns the overall recovery summary including total payments, retry recommendations, average uplift and estimated incremental revenue.



The FastAPI documentation is available at:



http://127.0.0.1:8000/docs



Dashboard



The React dashboard provides a visual summary of the recovery analysis.



It displays the total number of payments analyzed, payments recommended for retry, payments not recommended for retry and estimated incremental revenue.



The dashboard is connected to the FastAPI backend and displays the results generated by the recovery pipeline.



Running the Project



Create and activate the Python virtual environment.



Install the required Python packages using:



pip install -r requirements.txt



Generate the payment dataset using:



python backend/ml/generate\_data.py



Run the recovery analysis using:



python backend/ml/analyze\_recovery.py



Train the machine learning model using:



python backend/ml/train\_model.py



Run the causal analysis using:



python backend/ml/causal\_model.py



Start the FastAPI backend using:



python -m uvicorn backend.app.main:app --reload



The backend will normally run at:



http://127.0.0.1:8000



Open another terminal and start the frontend:



cd frontend



npm install



npm run dev



The dashboard will normally run at:



http://localhost:5173



Testing



The project includes backend API tests using pytest.



Run the tests using:



python -m pytest



The current test suite contains 4 API tests and all 4 tests are passing.



Demo Video



A five minute demonstration of the project will show the problem, solution, workflow, machine learning approach, FastAPI backend, React dashboard, recovery recommendations and final results.



Demo video:



VIDEO LINK WILL BE ADDED HERE



Build Challenges



One of the main challenges was distinguishing recovery caused by a retry from recovery that would have happened naturally.



To address this, the project uses treatment and control groups and calculates the difference between retry and no-retry outcomes.



Another challenge was converting the machine learning predictions into useful payment level decisions. This was handled by generating separate recovery probabilities for the retry and no-retry scenarios and calculating the predicted uplift for each payment.



Another challenge was connecting the machine learning results with the FastAPI backend and React dashboard. The recovery service was used to expose the prediction results through APIs, which are then consumed by the frontend.



API testing was also added to verify that the backend endpoints return the expected results.



Future Improvements



The current project uses a generated dataset for demonstrating the complete workflow.



Future versions could use a larger real world payment dataset and additional customer and transaction features.



More advanced uplift modeling techniques could also be evaluated and the model could be monitored over time for changes in performance.



The system could also be extended with payment gateway integration, scheduled recovery campaigns, real time decision making and cloud deployment.



Conclusion



Revenue Recovery Causal Lab focuses on a simple but important idea: recovering money after a retry is not the same as proving that the retry caused the recovery.



By combining machine learning with treatment and control analysis and uplift based decision making, the system identifies payments where a retry is more likely to create additional recovery.



The current prototype analyzes 10,000 payments, recommends 369 targeted retries and estimates Rs. 22,806.90 in potential incremental revenue on the generated dataset.



The complete source code and implementation are available in this repository.

