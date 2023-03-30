import numpy as np
import json
import os

# Set the directory path
dir_path = './data/label'

# Iterate through the files in the directory
for filename in os.listdir(dir_path):
    print(dir_path + filename)
    with open(dir_path+'/' + filename, 'r') as f:
        lines = f.readlines()

    # Define an empty list to store the data
    data = []

    # Loop through each line of the input file
    for line in lines:
        # Split the line into fields using the ";" separator
        fields = line.strip().split(";")

        # Convert the fields to a dictionary
        record = {
            "id": fields[0],
            "center_x": float(fields[1]),
            "center_y": float(fields[2]),
            "based_z": float(fields[3]),
            "size_x": float(fields[4]),
            "size_y": float(fields[5]),
            "size_z": float(fields[6]),
            "yaw_angle": float(fields[7]),
            "object_class": fields[8]
        }

        # Add the dictionary to the list of data
        data.append(record)

    # Write the data out to a JSON file
    with open(dir_path + filename + '.json', 'w') as f:
        json.dump(data, f)




