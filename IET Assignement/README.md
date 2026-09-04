# Bank Customer Subscription Prediction and Customer Segmentation

## Project Title
Bank Customer Subscription Prediction and Customer Segmentation

## Problem Statement
The banking industry frequently uses direct marketing campaigns (like phone calls) to attract customers for term deposits. The challenge is to optimize these campaigns by identifying the customers most likely to subscribe, reducing marketing costs, and increasing overall conversion rates. Additionally, identifying different customer segments helps tailor marketing approaches for varying demographics.

## Objectives
1. Implement a complete Data Science workflow from data retrieval to final recommendations.
2. Build and compare classification models (kNN, Decision Tree, Logistic Regression) to predict if a client will subscribe to a term deposit.
3. Perform customer segmentation using K-Means clustering to discover meaningful groups.
4. Extract actionable marketing recommendations from both classification and clustering results.

## Dataset Description
The dataset contains information about direct marketing campaigns of a Portuguese banking institution. It includes demographics, financial features, and past campaign outcomes.

## Dataset Source
**Source:** UCI Machine Learning Repository  
**URL:** [https://archive.ics.uci.edu/dataset/222/bank+marketing](https://archive.ics.uci.edu/dataset/222/bank+marketing)

## Libraries Used
- `pandas`: Data manipulation and analysis
- `numpy`: Numerical computations
- `matplotlib`: Creating static, animated, and interactive visualizations
- `seaborn`: Statistical data visualization
- `scikit-learn`: Machine learning algorithms and evaluation metrics
- `scipy`: Statistical inferences and calculations
- `requests`: Fetching the dataset over the web

## Workflow
1. **Data Retrieval:** Download and extract the dataset from UCI.
2. **Preprocessing:** Clean data, encode categorical variables, and scale numerical features.
3. **Exploratory Data Analysis (EDA):** Visualize distributions and relationships.
4. **Statistical Analysis:** Calculate descriptive stats and confidence intervals.
5. **Machine Learning:** Train kNN, Decision Tree, and Logistic Regression models.
6. **Evaluation:** Compare models based on Accuracy, Precision, Recall, and F1-score.
7. **Clustering:** Apply K-Means and determine optimal clusters using the Elbow Method.
8. **Interpretation & Recommendations:** Extract business value from the findings.

## Preprocessing
- Missing values and duplicate rows are identified and handled.
- Categorical variables are One-Hot Encoded.
- The target variable `y` is encoded to 0 (no) and 1 (yes).
- Numerical features are standardized using `StandardScaler` to ensure optimal performance for distance-based algorithms like kNN and K-Means.

## EDA
Exploratory Data Analysis visualizations are saved in `outputs/graphs/`:
- Age Distribution (Histogram)
- Age vs. Subscription (Boxplot)
- Correlation Heatmap

## Statistical Analysis
Descriptive statistics (Mean, Variance, Covariance, Correlation, Standard Deviation) are saved to `outputs/tables/descriptive_statistics.csv`. A 95% Confidence Interval for the mean age is also calculated.

## Machine Learning Models
Three classification algorithms are implemented:
- **k-Nearest Neighbours (kNN)**
- **Decision Tree / CART**
- **Logistic Regression**

## Model Evaluation
Models are evaluated on test data using Accuracy, Precision, Recall, and F1-score. Confusion matrices are saved in `outputs/graphs/`. The comparison table is stored in `outputs/tables/model_comparison.csv`.

## K-Means Clustering
K-Means is applied to identify customer segments based on key features (`age`, `balance`, `duration`). The Elbow Method graph is saved in `outputs/graphs/elbow_method.png`. A 2D PCA representation of the clusters is saved as well.

## Key Findings
- Tree-based models and Logistic Regression typically offer robust performance for tabular data of this nature.
- Key features like call duration and balance strongly influence the likelihood of a subscription.
- Customer segments successfully identify highly engaged customers vs. those who require less marketing focus.

## Marketing Recommendations
- Focus marketing efforts on the cluster/segment showing the highest likelihood of term deposit subscription.
- Limit resources spent on the low-engagement segment to optimize ROI.
- Tailor communication strategies for older, higher-balance customers versus younger, lower-balance customers.

## Conclusion
The project successfully maps the theoretical steps of the Data Science lifecycle to a practical dataset. By classifying customers and segmenting the database, the bank can achieve more targeted and efficient marketing campaigns.

## How to Run the Project
Ensure you have the required libraries installed:
```bash
pip install -r requirements.txt
```
Run the main script from the root directory:
```bash
python main.py
```
This will automatically download the dataset, process it, generate all visualizations, train the models, and output the final report content in the `outputs/` folder.
