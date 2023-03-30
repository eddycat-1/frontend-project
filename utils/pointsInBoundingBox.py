import json
import math
  
def apply_yaw_x(x, y, yaw):
    return x*math.cos(yaw) - y*math.sin(yaw)

def apply_yaw_y(x, y, yaw):
    return x*math.sin(yaw) + y*math.cos(yaw)

# Define a function to filter the point cloud data by the bounding box
def filter_point_cloud_data(point_cloud_data, bbox):
    filtered_data = []
    for point in point_cloud_data:
        if (bbox['x_min'] <= apply_yaw_x(point['x']-bbox['center_x'],point['y']-bbox['center_y'],bbox['yaw_angle'])+bbox['center_x'] <= bbox['x_max'] and
            bbox['y_min'] <= apply_yaw_y(point['x']-bbox['center_x'],point['y']-bbox['center_y'],bbox['yaw_angle'])+bbox['center_y'] <= bbox['y_max'] and
            bbox['z_min'] <= point['z'] <= bbox['z_max']):
            filtered_data.append(point)
    return filtered_data
            

for i in range(0,10):
    # Opening JSON file
    f = open('./data/000'+str(i)+'.bin.json')
    
    # returns JSON object as 
    # a dictionary
    point_data = json.load(f)

    point_cloud_data = []
    for point in point_data['data']:
        point_cloud_data.append({ 'x': point[0], 'y': point[1], 'z': point[2]})
    
    # Closing file
    f.close()

    f = open('./data/label000'+str(i)+'.txt.json')
    # returns JSON object as 
    # a dictionary
    bbox_data = json.load(f)
    bbox_transformed = []

    for bbox in bbox_data:
        bbox_transformed.append({'id': bbox['id'],
            'yaw_angle': bbox['yaw_angle'],
            'center_x': bbox['center_x'],
            'center_y': bbox['center_y'],
            'x_min': bbox['center_x']-bbox['size_x']/2,
            'x_max': bbox['center_x']+bbox['size_x']/2,
            'y_min': bbox['center_y']-bbox['size_y']/2,
            'y_max': bbox['center_y']+bbox['size_y']/2,
            'z_min': bbox['based_z'],
            'z_max': bbox['based_z']+bbox['size_z']})
    
    # Closing file
    f.close()

    # Filter the point cloud data by the bounding box
    filtered_points = []
    for box in bbox_transformed:
        filtered_points.append({box['id'] :filter_point_cloud_data(point_cloud_data, box)})

    with open('filtered_point_cloud_data'+str(i)+'.json', 'w') as outfile:
        json.dump(filtered_points, outfile)