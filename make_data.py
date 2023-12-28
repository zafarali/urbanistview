import csv
import random

# Approximate latitude and longitude bounds for Vancouver, Canada
lat_bounds = [49.1891, 49.3245]
lng_bounds = [-123.2540, -123.0540]

def generate_data(num_points=100):
    data = []
    for _ in range(num_points):
        lat = random.uniform(lat_bounds[0], lat_bounds[1])
        lng = random.uniform(lng_bounds[0], lng_bounds[1])
        cyclists = random.choice(["true", "false", None])  
        transit = random.choice(["true", "false", None])
        safety = random.choice(["true", "false", None])
        data.append({
            "cyclists": cyclists,
            "transit": transit,
            "safety": safety,
            "latitude": lat,
            "longitude": lng
        })
    return data

# Generate 50 random data points
data = generate_data(50)

# Save data to a CSV file
with open("data.csv", "w", newline="") as csvfile:
    fieldnames = ["cyclists", "transit", "safety", "latitude", "longitude"]
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(data)

print("Data saved to data.csv")
