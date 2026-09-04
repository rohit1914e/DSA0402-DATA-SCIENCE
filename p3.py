import numpy as np

house_data = np.array([
    [3, 1500, 250000],
    [5, 2200, 450000],
    [4, 1800, 320000],
    [6, 2800, 600000],
    [5, 2400, 500000]
])

filtered_houses = house_data[house_data[:, 0] > 4]

average_price = np.mean(filtered_houses[:, 2])

print("Average Sale Price of Houses with More Than 4 Bedrooms:", average_price)