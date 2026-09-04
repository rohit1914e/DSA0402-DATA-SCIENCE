import numpy as np

sales_data = np.array([
    [120, 150, 130],
    [200, 210, 190],
    [160, 170, 180]
])

print("Sales Data:")
print(sales_data)

average_price = np.mean(sales_data)

print("\nAverage Price of All Products Sold:", average_price)