# routes.py handles the server and server requests

from flask import Flask, render_template, json, jsonify, request
import os
import sys
# ONEXBindings is created using ONEXBindings.cpp and the makefile
import ONEXBindings

# named tuples are basically structs
from collections import namedtuple
# importing the formatForChart function from my txtToJson.py file
sys.path.append(os.path.relpath(".."))
from txtToJson import formatForChart

# necessary for flask
app = Flask(__name__)

# This helps when loading datasets
struct = namedtuple("dbData", "path seqCount seqLength newlineDrop")

# Initial values
sets = [struct("../../ONEX/data/ItalyPower.txt", 67, 24, 1)]#, struct("../../ONEX/data/ECG.txt", 200, 96, 1)]
selectedDataset = -1
ST = 0.2 # default value
distanceAlg = ""
# 0 is similarityQuery from dataset
# 1 is similarityQuery from file
# 2 is outlierDetection
queryOption = -1
seriesIndex = -1
querySeries = -1
queryFile = ""
start = -1
length = 0

bestSimMatchIndex = -1;
bestSimMatchDistance = -1;

# For debugging. This prints all the global values to the terminal
def printStuff():
	print "selected Dataset: " + str(selectedDataset)
	print "ST: " + str(ST)
	print "distanceAlg: " + str(distanceAlg)
	print "queryOption: " + str(queryOption)
	print "seriesIndex: " + str(seriesIndex)
	print "queryFile: " + str(queryFile)
	print "start: " + str(start)
	print "length: " + str(length)
	print "querySeries: " + str(querySeries)
	print "bestMatchIndex: " + str(bestSimMatchIndex)
	print "bestMatchDist: " + str(bestSimMatchDistance)

# When Main.js makes an ajax call to '/_datasetChange' it gets handled by datasetChange().
# Handles a change in the chosen dataset
@app.route('/_datasetChange')
def datasetChange():
	global selectedDataset
	global seriesIndex
	global ST
	# update global values with incoming data. the request.args.get(...) gets data passed through the ajax function
	selectedDataset = int(request.args.get('datasetIndex'))
	seriesIndex = int(request.args.get('seriesIndex'))
	ST = float(request.args.get('threshold'))
	# print selectedDataset
	# printStuff()
	return distanceAlg # must return something

# Handles a change in the chosen distance
@app.route('/_distanceUpdate')
def distanceUpdate():
	global distanceAlg
	distanceAlg = float(request.args.get('distance'))
	# printStuff()
	return distanceAlg

# When outlier detection is ran
# TODO: actually run ONEX
@app.route('/_outlierUpdate')
def outlierDetection():
	global queryOption
	global start
	global length
	queryOption = 2 # outlier detection
	start = int(request.args.get('start'))
	length = int(request.args.get('length'))
	# printStuff()
	return start

# When a query from a file is selected
# TODO: actually load the file and run ONEX
@app.route('/_fileQueryUpdate')
def loadFileQuery():
	global queryOption
	global queryFile
	global start
	global length
	queryOption = 1 # similarity query from file
	queryFile = request.args.get('filename')
	start = int(request.args.get('start'))
	length = int(request.args.get('length'))
	# printStuff()
	return start

# When a query from a dataset is selected
@app.route('/_datasetQueryUpdate')
def loadDatasetQuery():
	global queryOption
	global querySeries
	global start
	global length
	queryOption = 0 # similarity query from dataset
	querySeries = int(request.args.get('seriesIndex'))
	start = int(request.args.get('start'))
	length = int(request.args.get('length'))
	printStuff()
	return viewResults() # calls to run ONEX based on inputs

# Calls the ONEX bindings based on the state of the global flags
@app.route('/_viewResults')
def viewResults():
	global bestSimMatchDistance
	global bestSimMatchIndex

	# If bad length or bad start, don't do anything
	# TODO: Fix for outlier detection!
	if length == 0 or start == -1:
		return jsonify(datasetIndex=-1)

	# Call the ONEX Bindings
	if queryOption == 0: # 0 is similarityQuery from dataset
		ONEXBindings.computeSimilarFromDataset(selectedDataset, querySeries, start, length)
	if queryOption == 1: # 1 is similarityQuery from file
		ONEXBindings.computeSimilarFromFile()
	if queryOption == 2:# 2 is outlierDetection
		ONEXBindings.computeOutlier()

	# save all information
	bestSimMatchIndex = ONEXBindings.getSimSeqNum()
	bestSimMatchDistance = ONEXBindings.getSimDist()
	# return all data
	return jsonify(datasetIndex=selectedDataset, seriesIndex=bestSimMatchIndex, distance=bestSimMatchDistance)

# Loads the starting data into the webapp.
@app.route('/_datasets')
def loadFiles():
	global sets
	data = []
	# run through all datasets
	for index, s in enumerate(sets):
		# Load and group using ONEX bindings
		ONEXBindings.loadTimeSeries(index, s.path, s.seqCount, s.seqLength, s.newlineDrop, float(ST))
		# Add to the list of datasets
		data.append(formatForChart(s.path)) # from txtToJson.py
		print "finished grouping: " + s.path
	return jsonify(data=data) # return the available list of datasets

# This is the homepage.
@app.route('/')
def home():
	return render_template('index.html')

if __name__ == '__main__':
	app.run(debug=True)
