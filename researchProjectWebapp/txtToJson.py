import json
# from flask import Flask, jsonify

# app = Flask(__name__)

def filenameWithExtension(f):
	i = f.rfind("/") # Linux filepath
	if i == -1:
		return f
	return f[i+1:]

def filenameWithoutExtension(f):
	# removes directory info
	f = filenameWithExtension(f)
	i = f.find('.')
	if i == -1:
		return f
	return f[:i]

# This function turns the incoming file into the json format needed
# for the react-chartJS object
# param files: list of the file names located in the ONEX data directory
# 	ex) "../ItalyPower.txt"
def formatForChart(f):
	datasetTitle = filenameWithoutExtension(f)

	firstSeries = True
	legend = []
	legendCount = 0
	timeSeriesCount = 0
	timeSeries = []

	fi = open(f, 'r')

	for line in fi:
		nums = []
		if line == '\r\n' or line == '\r' or line == '\n':
			continue

		timeSeriesCount += 1
		for num in line.split():
			nums.append(float(num))
			if firstSeries:
				if legendCount % 10 == 0:
					legend.append(str(legendCount))
				else:
					legend.append("")
				legendCount += 1

		firstSeries = False
		title = 'Time Series ' + str(timeSeriesCount)
		timeSeries.append({'title': title, 'data': nums, 'borderColor': 'FF0000'})

	fi.close()
	return {'title': datasetTitle, \
			'datasets' : timeSeries, \
			'labels': legend}

# if __name__ == "__main__":
#     print formatForChart("../ItalyPower.txt")

def writeToFile(f):
	# relative path from researchProjectWebapp/server to ONEX/data
	dataset = '../../ONEX/data/' + filenameWithExtension(f)
	datasetTitle = filenameWithoutExtension(f)
	fo = open('server/static/data/' + datasetTitle + '.json', 'w')

	fo.write('{\n')
	fo.write("\t\"title\" : \"")
	fo.write(datasetTitle + "\",")
	fo.write("\n\t\"datasets\" : [\n")

	firstSeries = True
	legend = []
	legendCount = 0
	timeSeriesCount = 0

	fi = open(dataset, 'r')

	for line in fi:
		nums = []
		if line == '\r\n':
			continue

		timeSeriesCount += 1
		for num in line.split():
			nums.append(float(num))
			if firstSeries:
				if legendCount % 10 == 0:
					legend.append(str(legendCount))
				else:
					legend.append("")
				legendCount += 1

		if firstSeries:
			firstSeries = False
		else:
			fo.write(",")

		fo.write("\n\t{")
		fo.write("\n\t\t\"title\" : \"Time Series ")
		fo.write(str(timeSeriesCount) + "\",")
		fo.write("\n\t\t\"data\" : ")
		fo.write(json.dumps(nums))
		fo.write("\n\t}")

	fo.write("\n\t],")

	# Make the labels show the 10's
	fo.write("\n\t\"labels\" : ")
	fo.write(json.dumps(legend))
	fo.write('\n}')

	fi.close()
	fo.close()
