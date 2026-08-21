AI Revenue Recovery Causal Lab



Causal AI based payment recovery and incremental revenue analysis system.



About the project



When a payment fails, simply retrying every failed payment is not always a good strategy. Some customers may complete the payment on their own even without a retry.



This project uses machine learning and causal analysis to estimate whether retrying a failed payment is actually useful. It compares the expected recovery probability with a retry against the probability without a retry and calculates the uplift between the two.



Based on this uplift, the system recommends which payments should be retried and estimates the possible incremental revenue from those retries.



Main features



1\. Generates a dataset containing failed payment records and customer payment history.



2\. Analyzes recovery rates between the treatment group and control group.



3\. Trains a Random Forest model to predict payment recovery.



4\. Builds separate models for customers with retry and without retry.



5\. Calculates the predicted uplift for each payment.



6\. Recommends retry only when the predicted uplift is at least 10%.



7\. Estimates the incremental revenue that can potentially be recovered.



8\. Groups payments into different uplift segments for analysis.



9\. Provides a FastAPI backend for accessing the results.



10\. Provides a React dashboard to display the analysis and recommendations.



Technology used



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



Machine learning

Random Forest Classifier

One Hot Encoding

Treatment and control modeling

Causal uplift analysis



Project structure



backend/app contains the FastAPI application and recovery service.



backend/ml contains the data generation, recovery analysis, model training and causal analysis scripts.



data contains the generated payment dataset and recovery predictions.



frontend contains the React dashboard.



requirements.txt contains the Python dependencies.



How to run the project



First create and activate the Python virtual environment.



Then install the required packages using:



pip install -r requirements.txt



Generate the payment data:



python backend/ml/generate\_data.py



Run the recovery analysis:



python backend/ml/analyze\_recovery.py



Train the machine learning model:



python backend/ml/train\_model.py



Run the causal model:



python backend/ml/causal\_model.py



Start the backend:



python -m uvicorn backend.app.main:app --reload



The API will run at:



http://127.0.0.1:8000



The API documentation is available at:



http://127.0.0.1:8000/docs



To start the frontend, open another terminal and run:



cd frontend



npm run dev



The dashboard will normally be available at:



http://localhost:5173



Current results



The current dataset contains 10,000 payment records.



The model recommends 369 payments for retry and 9,631 payments for not retrying.



The average predicted uplift is 0.29%.



The observed treatment effect between the retry and control groups is 5.68%.



The estimated incremental revenue from the recommended retry payments is approximately Rs. 22,806.90.



Model performance on the current test data:



Accuracy: 55.45%



Precision: 51.35%



Recall: 47.81%



ROC-AUC: 56.22%



These results are based on the generated dataset and are intended to demonstrate the working of the causal recovery approach.



API endpoints



GET /



Returns the API status.



GET /health



Checks whether the backend is running.



GET /api/recovery/summary



Returns the overall recovery summary including payment counts, recommended retries, average uplift and estimated incremental revenue.



Future improvements



The project can be improved by using a larger real-world payment dataset, testing more advanced uplift modeling techniques, adding more customer and transaction features, monitoring model performance over time and deploying the system to a cloud environment.

