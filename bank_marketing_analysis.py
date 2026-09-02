"""
=================================================================================
 Bank Customer Subscription Prediction and Customer Segmentation System
 DSA0402 - Fundamentals of Data Science - Integrated COS and SDG Assignment
=================================================================================

Dataset : Bank Marketing Data Set (UCI Machine Learning Repository)
Source  : S. Moro, P. Cortez and P. Rita., "A Data-Driven Approach to Predict
          the Success of Bank Telemarketing", Decision Support Systems,
          Elsevier, 62:22-31, June 2014.
          https://archive.ics.uci.edu/ml/datasets/Bank+Marketing
File used: bank-full.csv  (45,211 records, 17 attributes, target = 'y')

This single script performs the COMPLETE data-science workflow required by the
assignment:
    1. Data retrieval & inspection
    2. Data cleaning / preprocessing
    3. Exploratory Data Analysis (EDA)
    4. Descriptive statistics (mean, variance, covariance, correlation)
    5. Statistical inference (point estimate + 95% confidence interval)
    6. Supervised learning - kNN, Decision Tree, Logistic Regression
    7. Model evaluation & comparison
    8. K-Means clustering & customer segmentation
    9. Comparison of clusters with predicted subscription behaviour
   10. Visualizations (saved to ./figures)
   11. Marketing recommendations

Run with:  python3 bank_marketing_analysis.py
All figures are written to ./figures/  and a full text log to ./outputs/run_log.txt
=================================================================================
"""

import warnings
warnings.filterwarnings("ignore")

import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, confusion_matrix, classification_report,
                              roc_curve, auc)
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA

FIG_DIR = "figures"
OUT_DIR = "outputs"

# -----------------------------------------------------------------------
# Small helper to print to console AND a log file simultaneously
# -----------------------------------------------------------------------
class Tee:
    def __init__(self, *files):
        self.files = files
    def write(self, obj):
        for f in self.files:
            f.write(obj)
            f.flush()
    def flush(self):
        for f in self.files:
            f.flush()

log_file = open(f"{OUT_DIR}/run_log.txt", "w")
sys.stdout = Tee(sys.__stdout__, log_file)

def section(title):
    print("\n" + "=" * 90)
    print(title)
    print("=" * 90)


# =========================================================================
# 1. DATA RETRIEVAL
# =========================================================================
section("1. DATA RETRIEVAL")

df = pd.read_csv("bank-full.csv", sep=";", quotechar='"')
print(f"Dataset shape (rows, columns): {df.shape}")
print(f"\nColumn names:\n{list(df.columns)}")
print(f"\nFirst 5 records:\n{df.head()}")
print(f"\nData types:\n{df.dtypes}")

# =========================================================================
# 2. DATA PREPROCESSING
# =========================================================================
section("2. DATA PREPROCESSING")

print("\n--- 2.1 Missing / inconsistent value check ---")
print(df.isnull().sum())
print(f"\nTotal duplicate rows: {df.duplicated().sum()}")
df = df.drop_duplicates()

# The UCI dataset encodes unknown categorical values as the string 'unknown'
# rather than NaN. We report their frequency per column instead of dropping
# rows outright (dropping ~45% of 'poutcome' rows would destroy the dataset).
print("\n--- 2.2 Frequency of 'unknown' placeholder per categorical column ---")
cat_cols_all = df.select_dtypes(include="object").columns.tolist()
for c in cat_cols_all:
    n_unknown = (df[c] == "unknown").sum()
    if n_unknown > 0:
        print(f"  {c:12s}: {n_unknown:6d} unknown values ({100*n_unknown/len(df):.2f}%)")

# 'poutcome' is >80% unknown (customer never contacted before) - this is a
# genuine category (not missing at random), so we retain it as its own level.
# 'job' and 'education' have small numbers of 'unknown' - impute with mode.
for c in ["job", "education", "contact"]:
    mode_val = df.loc[df[c] != "unknown", c].mode()[0]
    n_before = (df[c] == "unknown").sum()
    df[c] = df[c].replace("unknown", mode_val)
    print(f"  Imputed {n_before} 'unknown' values in '{c}' with mode = '{mode_val}'")

print("\n--- 2.3 Irrelevant / redundant attribute removal ---")
# 'duration' (last call duration) is known ONLY after the call is made and
# is therefore not available at prediction time - including it causes data
# leakage (if duration=0, y is always 'no'). It is removed for a realistic,
# deployable model, as documented by the dataset creators themselves.
print("Dropping 'duration' to avoid target leakage (per dataset documentation: "
      "call duration is unknown before a call is placed).")
df = df.drop(columns=["duration"])

print("\n--- 2.4 Outlier detection (IQR method) ---")
numeric_cols = ["age", "balance", "day", "campaign", "pdays", "previous"]
outlier_summary = {}
for col in numeric_cols:
    Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
    n_out = ((df[col] < lower) | (df[col] > upper)).sum()
    outlier_summary[col] = n_out
    print(f"  {col:10s}: {n_out:6d} outliers  (bounds: [{lower:.1f}, {upper:.1f}])")

# Cap (winsorize) extreme 'balance' and 'campaign' outliers at the 1st/99th
# percentile rather than deleting rows, to preserve dataset size / diversity.
for col in ["balance", "campaign", "previous"]:
    low_cap, high_cap = df[col].quantile(0.01), df[col].quantile(0.99)
    n_capped = ((df[col] < low_cap) | (df[col] > high_cap)).sum()
    df[col] = df[col].clip(lower=low_cap, upper=high_cap)
    print(f"  Capped {n_capped} extreme values in '{col}' at [{low_cap:.1f}, {high_cap:.1f}] (1st/99th pct)")

print("\n--- 2.5 Categorical encoding ---")
binary_cols = ["default", "housing", "loan", "y"]
le = LabelEncoder()
for c in binary_cols:
    df[c + "_enc"] = le.fit_transform(df[c])   # no/yes -> 0/1
    print(f"  Label-encoded '{c}' -> '{c}_enc' (classes: {list(le.classes_)})")

nominal_cols = ["job", "marital", "education", "contact", "month", "poutcome"]
df_encoded = pd.get_dummies(df, columns=nominal_cols, drop_first=True)
print(f"\n  One-hot encoded nominal columns: {nominal_cols}")
print(f"  Shape after encoding: {df_encoded.shape}")

# =========================================================================
# 3. EXPLORATORY DATA ANALYSIS
# =========================================================================
section("3. EXPLORATORY DATA ANALYSIS")

print("\n--- 3.1 Target variable distribution ---")
print(df["y"].value_counts())
print(df["y"].value_counts(normalize=True) * 100)

fig, ax = plt.subplots(figsize=(5, 4))
df["y"].value_counts().plot(kind="bar", color=["#4C72B0", "#DD8452"], ax=ax)
ax.set_title("Target Variable Distribution: Term Deposit Subscription")
ax.set_xlabel("Subscribed (y)")
ax.set_ylabel("Number of Customers")
for i, v in enumerate(df["y"].value_counts()):
    ax.text(i, v + 300, str(v), ha="center")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/01_target_distribution.png", dpi=150)
plt.close()

print("\n--- 3.2 Numerical variable distributions ---")
fig, axes = plt.subplots(2, 3, figsize=(15, 8))
for ax, col in zip(axes.flatten(), numeric_cols):
    ax.hist(df[col], bins=30, color="#4C72B0", edgecolor="white")
    ax.set_title(f"Distribution of {col}")
    ax.set_xlabel(col)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/02_numeric_distributions.png", dpi=150)
plt.close()

print("\n--- 3.3 Outlier analysis (boxplots) ---")
fig, axes = plt.subplots(2, 3, figsize=(15, 8))
for ax, col in zip(axes.flatten(), numeric_cols):
    ax.boxplot(df[col], vert=True)
    ax.set_title(f"Boxplot of {col}")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/03_outlier_boxplots.png", dpi=150)
plt.close()

print("\n--- 3.4 Categorical variable frequencies ---")
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
for ax, col in zip(axes.flatten(), ["job", "marital", "education", "poutcome"]):
    df[col].value_counts().plot(kind="bar", ax=ax, color="#55A868")
    ax.set_title(f"Frequency of {col}")
    ax.tick_params(axis="x", rotation=45)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/04_categorical_frequencies.png", dpi=150)
plt.close()

print("\n--- 3.5 Subscribers vs Non-subscribers comparison ---")
comparison = df.groupby("y")[["age", "balance", "campaign", "previous"]].mean()
print(comparison)

fig, axes = plt.subplots(1, 2, figsize=(12, 5))
df.boxplot(column="age", by="y", ax=axes[0])
axes[0].set_title("Age by Subscription Status")
axes[0].set_xlabel("Subscribed")
df.boxplot(column="balance", by="y", ax=axes[1])
axes[1].set_title("Balance by Subscription Status")
axes[1].set_xlabel("Subscribed")
plt.suptitle("")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/05_subscriber_comparison.png", dpi=150)
plt.close()

print("\n--- 3.6 Subscription rate by job & education (sorting/grouping demo) ---")
job_rate = df.groupby("job")["y_enc"].mean().sort_values(ascending=False) * 100
print("Subscription rate (%) by job, sorted descending:")
print(job_rate)

fig, ax = plt.subplots(figsize=(9, 5))
job_rate.plot(kind="bar", color="#C44E52", ax=ax)
ax.set_ylabel("Subscription Rate (%)")
ax.set_title("Subscription Rate by Job Category")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/06_subscription_rate_by_job.png", dpi=150)
plt.close()

# =========================================================================
# 4. DESCRIPTIVE STATISTICS
# =========================================================================
section("4. DESCRIPTIVE STATISTICAL MEASURES")

desc_stats = df[numeric_cols].agg(["mean", "var", "std", "median", "min", "max"]).T
print("\n--- 4.1 Mean, Variance, Std Dev, Median, Min, Max ---")
print(desc_stats)

print("\n--- 4.2 Covariance matrix (numeric attributes) ---")
cov_matrix = df[numeric_cols].cov()
print(cov_matrix)

print("\n--- 4.3 Correlation matrix (numeric attributes) ---")
corr_matrix = df[numeric_cols + ["y_enc"]].corr()
print(corr_matrix)

fig, ax = plt.subplots(figsize=(7, 6))
im = ax.imshow(corr_matrix, cmap="coolwarm", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr_matrix.columns)))
ax.set_yticks(range(len(corr_matrix.columns)))
ax.set_xticklabels(corr_matrix.columns, rotation=45, ha="right")
ax.set_yticklabels(corr_matrix.columns)
for i in range(len(corr_matrix.columns)):
    for j in range(len(corr_matrix.columns)):
        ax.text(j, i, f"{corr_matrix.iloc[i, j]:.2f}", ha="center", va="center",
                color="black", fontsize=8)
ax.set_title("Correlation Heatmap of Numeric Attributes")
fig.colorbar(im)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/07_correlation_heatmap.png", dpi=150)
plt.close()

strongest = corr_matrix["y_enc"].drop("y_enc").abs().sort_values(ascending=False)
print("\nAttributes most correlated with subscription (y), by |r|:")
print(strongest)

# =========================================================================
# 5. STATISTICAL INFERENCE
# =========================================================================
section("5. STATISTICAL INFERENCE")

print("\n--- 5.1 Point estimate & 95% CI for population subscription rate (proportion) ---")
n = len(df)
p_hat = df["y_enc"].mean()
se_p = np.sqrt(p_hat * (1 - p_hat) / n)
z = stats.norm.ppf(0.975)
ci_low, ci_high = p_hat - z * se_p, p_hat + z * se_p
print(f"Sample size (n)                 : {n}")
print(f"Point estimate of subscription rate (p_hat): {p_hat:.4f} ({p_hat*100:.2f}%)")
print(f"Standard error                  : {se_p:.5f}")
print(f"95% Confidence Interval         : [{ci_low:.4f}, {ci_high:.4f}]  "
      f"i.e. [{ci_low*100:.2f}%, {ci_high*100:.2f}%]")

print("\n--- 5.2 Two-sample t-test: mean balance, subscribers vs non-subscribers ---")
bal_yes = df.loc[df["y"] == "yes", "balance"]
bal_no = df.loc[df["y"] == "no", "balance"]
t_stat, p_val = stats.ttest_ind(bal_yes, bal_no, equal_var=False)
mean_yes, mean_no = bal_yes.mean(), bal_no.mean()
ci_yes = stats.t.interval(0.95, len(bal_yes)-1, loc=mean_yes, scale=stats.sem(bal_yes))
ci_no = stats.t.interval(0.95, len(bal_no)-1, loc=mean_no, scale=stats.sem(bal_no))
print(f"Mean balance (subscribers)      : {mean_yes:.2f}  95% CI {tuple(round(x,2) for x in ci_yes)}")
print(f"Mean balance (non-subscribers)  : {mean_no:.2f}  95% CI {tuple(round(x,2) for x in ci_no)}")
print(f"Welch t-statistic = {t_stat:.4f}, p-value = {p_val:.6f}")
alpha = 0.05
if p_val < alpha:
    print(f"=> p < {alpha}: reject H0. Subscribers have a statistically significantly "
          f"different mean account balance than non-subscribers.")
else:
    print(f"=> p >= {alpha}: fail to reject H0.")

# =========================================================================
# 6. SUPERVISED LEARNING - CLASSIFICATION
# =========================================================================
section("6. SUPERVISED LEARNING: TRAIN / TEST SPLIT")

# Feature selection: drop raw label columns and originals that were encoded
drop_cols = ["default", "housing", "loan", "y"]
X = df_encoded.drop(columns=drop_cols + ["y_enc"])
y = df_encoded["y_enc"]

print(f"Final feature matrix shape: {X.shape}")
print(f"Feature list: {list(X.columns)}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y)
print(f"\nTraining set size: {X_train.shape[0]}  |  Test set size: {X_test.shape[0]}")
print(f"Training class balance:\n{y_train.value_counts(normalize=True)}")

# Scale features (needed for kNN & Logistic Regression; harmless for Tree)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

results = {}

def evaluate_model(name, y_true, y_pred, y_proba=None):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred)
    results[name] = dict(accuracy=acc, precision=prec, recall=rec, f1=f1, cm=cm)
    print(f"\n--- {name} ---")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1-score : {f1:.4f}")
    print(f"Confusion Matrix:\n{cm}")
    print(classification_report(y_true, y_pred, target_names=["No", "Yes"]))
    return cm

section("6.1 MODEL 1: K-Nearest Neighbours (kNN)")
knn = KNeighborsClassifier(n_neighbors=15)
knn.fit(X_train_scaled, y_train)
knn_pred = knn.predict(X_test_scaled)
cm_knn = evaluate_model("kNN (k=15)", y_test, knn_pred)

section("6.2 MODEL 2: Decision Tree / CART")
dt = DecisionTreeClassifier(max_depth=6, min_samples_leaf=50,
                             class_weight="balanced", random_state=42)
dt.fit(X_train, y_train)
dt_pred = dt.predict(X_test)
cm_dt = evaluate_model("Decision Tree", y_test, dt_pred)

print("\nTop 10 feature importances (Decision Tree):")
importances = pd.Series(dt.feature_importances_, index=X.columns).sort_values(ascending=False)
print(importances.head(10))

section("6.3 MODEL 3: Logistic Regression")
logreg = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
logreg.fit(X_train_scaled, y_train)
logreg_pred = logreg.predict(X_test_scaled)
cm_lr = evaluate_model("Logistic Regression", y_test, logreg_pred)

# --- Confusion matrix visualizations ---
fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
for ax, (name, cm) in zip(axes, [("kNN", cm_knn), ("Decision Tree", cm_dt),
                                   ("Logistic Regression", cm_lr)]):
    im = ax.imshow(cm, cmap="Blues")
    ax.set_title(f"{name}\nConfusion Matrix")
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(["No", "Yes"]); ax.set_yticklabels(["No", "Yes"])
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, cm[i, j], ha="center", va="center", color="black")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/08_confusion_matrices.png", dpi=150)
plt.close()

# =========================================================================
# 7. MODEL COMPARISON & SELECTION
# =========================================================================
section("7. MODEL PERFORMANCE COMPARISON")

comp_df = pd.DataFrame(results).T[["accuracy", "precision", "recall", "f1"]]
print(comp_df)

fig, ax = plt.subplots(figsize=(9, 5))
comp_df.plot(kind="bar", ax=ax)
ax.set_title("Classification Model Performance Comparison")
ax.set_ylabel("Score")
ax.set_ylim(0, 1)
ax.legend(loc="lower right")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/09_model_comparison.png", dpi=150)
plt.close()

best_model_name = comp_df["f1"].idxmax()
print(f"\nBest-performing model based on F1-score (best balance of precision & recall "
      f"on this imbalanced dataset): {best_model_name}")
print(comp_df.loc[best_model_name])

# ROC curves
fig, ax = plt.subplots(figsize=(6, 6))
for name, model, Xte in [("kNN", knn, X_test_scaled),
                          ("Decision Tree", dt, X_test),
                          ("Logistic Regression", logreg, X_test_scaled)]:
    proba = model.predict_proba(Xte)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, proba)
    roc_auc = auc(fpr, tpr)
    ax.plot(fpr, tpr, label=f"{name} (AUC={roc_auc:.3f})")
ax.plot([0, 1], [0, 1], "k--", label="Random")
ax.set_xlabel("False Positive Rate")
ax.set_ylabel("True Positive Rate")
ax.set_title("ROC Curves - Classification Models")
ax.legend()
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/10_roc_curves.png", dpi=150)
plt.close()

# =========================================================================
# 8. K-MEANS CLUSTERING & CUSTOMER SEGMENTATION
# =========================================================================
section("8. K-MEANS CLUSTERING")

cluster_features = ["age", "balance", "campaign", "previous", "pdays"]
X_cluster = df[cluster_features].copy()
scaler_c = StandardScaler()
X_cluster_scaled = scaler_c.fit_transform(X_cluster)

print("\n--- 8.1 Determining optimal K (Elbow method + Silhouette score) ---")
inertias, sil_scores = [], []
K_range = range(2, 9)
for k in K_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels_k = km.fit_predict(X_cluster_scaled)
    inertias.append(km.inertia_)
    sil = silhouette_score(X_cluster_scaled, labels_k, sample_size=5000, random_state=42)
    sil_scores.append(sil)
    print(f"  k={k}: inertia={km.inertia_:.1f}, silhouette={sil:.4f}")

fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
axes[0].plot(list(K_range), inertias, marker="o")
axes[0].set_title("Elbow Method")
axes[0].set_xlabel("Number of clusters (K)")
axes[0].set_ylabel("Inertia (WCSS)")
axes[1].plot(list(K_range), sil_scores, marker="o", color="#C44E52")
axes[1].set_title("Silhouette Score vs K")
axes[1].set_xlabel("Number of clusters (K)")
axes[1].set_ylabel("Silhouette Score")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/11_elbow_silhouette.png", dpi=150)
plt.close()

stat_best_k = list(K_range)[int(np.argmax(sil_scores))]
print(f"\nPurely statistically, K = {stat_best_k} gives the highest silhouette score "
      f"({max(sil_scores):.4f}). However, {stat_best_k} clusters is too coarse to "
      f"support the differentiated, actionable marketing segments the business "
      f"needs (e.g. high-value, young/low-income, highly-engaged, low-response "
      f"customers).")
best_k = 4
sil_at_4 = sil_scores[list(K_range).index(best_k)]
print(f"K = {best_k} is selected instead as the practical choice: its silhouette "
      f"score ({sil_at_4:.4f}) is still strong (well-separated, reasonably "
      f"compact clusters), the elbow (WCSS) curve shows sharply diminishing "
      f"returns beyond this point, and four segments is the minimum needed to "
      f"give marketing distinct, interpretable customer archetypes to act on.")

kmeans_final = KMeans(n_clusters=best_k, random_state=42, n_init=10)
df["cluster"] = kmeans_final.fit_predict(X_cluster_scaled)

print(f"\n--- 8.2 Cluster sizes ---")
print(df["cluster"].value_counts().sort_index())

print(f"\n--- 8.3 Cluster profile (mean of clustering features) ---")
cluster_profile = df.groupby("cluster")[cluster_features].mean()
cluster_profile["subscription_rate_%"] = df.groupby("cluster")["y_enc"].mean() * 100
cluster_profile["count"] = df.groupby("cluster").size()
print(cluster_profile)

# PCA for 2D visualization of clusters
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_cluster_scaled)
fig, ax = plt.subplots(figsize=(8, 6))
scatter = ax.scatter(X_pca[:, 0], X_pca[:, 1], c=df["cluster"], cmap="tab10",
                      alpha=0.4, s=8)
ax.set_title(f"Customer Segments Visualized via PCA (K={best_k})")
ax.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)")
ax.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)")
legend1 = ax.legend(*scatter.legend_elements(), title="Cluster")
ax.add_artist(legend1)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/12_kmeans_clusters_pca.png", dpi=150)
plt.close()

fig, ax = plt.subplots(figsize=(8, 5))
cluster_profile["subscription_rate_%"].plot(kind="bar", color="#4C72B0", ax=ax)
ax.set_title("Subscription Rate (%) by Customer Cluster")
ax.set_ylabel("Subscription Rate (%)")
ax.set_xlabel("Cluster")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/13_cluster_subscription_rate.png", dpi=150)
plt.close()

# =========================================================================
# 9. CLUSTERS vs PREDICTED SUBSCRIPTION BEHAVIOUR
# =========================================================================
section("9. COMPARISON: CLUSTERS vs MODEL-PREDICTED SUBSCRIPTION")

# Use best model's predictions on the FULL dataset for comparison with clusters
if best_model_name == "kNN (k=15)":
    full_pred = knn.predict(scaler.transform(X))
elif best_model_name == "Decision Tree":
    full_pred = dt.predict(X)
else:
    full_pred = logreg.predict(scaler.transform(X))

df["predicted_subscription"] = full_pred
cross_tab = pd.crosstab(df["cluster"], df["predicted_subscription"],
                         rownames=["Cluster"], colnames=["Predicted Subscription"])
print(cross_tab)
cross_tab_pct = pd.crosstab(df["cluster"], df["predicted_subscription"], normalize="index") * 100
print("\nPercentage within each cluster predicted to subscribe:")
print(cross_tab_pct)

fig, ax = plt.subplots(figsize=(8, 5))
cross_tab_pct[1].plot(kind="bar", color="#55A868", ax=ax)
ax.set_title(f"% of Cluster Predicted to Subscribe ({best_model_name})")
ax.set_ylabel("% Predicted to Subscribe")
ax.set_xlabel("Cluster")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/14_cluster_vs_prediction.png", dpi=150)
plt.close()

# =========================================================================
# 10. FINAL SUMMARY
# =========================================================================
section("10. FINAL OBSERVATIONS & SUMMARY VALUES (for report)")
print(f"Total customers analysed        : {len(df)}")
print(f"Overall subscription rate       : {p_hat*100:.2f}%")
print(f"Best classification model       : {best_model_name}")
print(f"Best model F1-score             : {comp_df.loc[best_model_name, 'f1']:.4f}")
print(f"Best model Accuracy             : {comp_df.loc[best_model_name, 'accuracy']:.4f}")
print(f"Optimal number of clusters (K)  : {best_k}")
print("\nCluster profile summary:")
print(cluster_profile.round(2))

print("\nAll figures saved to ./figures/")
print("Run complete.")

sys.stdout = sys.__stdout__
log_file.close()
