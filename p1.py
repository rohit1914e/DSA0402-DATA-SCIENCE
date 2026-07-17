import numpy as np

student_scores = np.array([
    [85, 78, 92, 88],
    [76, 90, 84, 80],
    [90, 85, 88, 91],
    [80, 87, 86, 89]
])

subjects = ["Math", "Science", "English", "History"]

average_scores = np.mean(student_scores, axis=0)

print("Average Marks of Each Subject:")

for i in range(len(subjects)):
    print(subjects[i], ":", average_scores[i])

highest_index = np.argmax(average_scores)

print("\nSubject with Highest Average:")
print(subjects[highest_index], ":", average_scores[highest_index])