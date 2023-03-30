import numpy as np
import json
import os

# Set the directory path
dir_path = './data/lidar'

# Iterate through the files in the directory
for filename in os.listdir(dir_path):
    print(filename)
    points_arr = np.fromfile('./data/lidar/' + filename, dtype=np.float32).reshape(-1, 4)
    # Convert the NumPy array to a Python dictionary
    arr_dict = {'data': points_arr.tolist()}
    # Write the dictionary to a JSON file
    filename_path = './data/'+filename+'.json'
    with open(filename_path, 'w') as outfile:
        json.dump(arr_dict, outfile)






