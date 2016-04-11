import json

datasets = ['../ECG.txt', '../ItalyPower.txt']
datasetTitles = ["ECG", "ItalyPower"]

fo = open('public/data/datasets.json', 'w')

fo.write('[')

firstDataset = True

for index, dataset in enumerate(datasets):
	if firstDataset:
		firstDataset = False
	else:
		fo.write(",")
	fo.write('{\n')
	fo.write("\t\"title\" : \"")
	fo.write(datasetTitles[index] + "\",")
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

fo.write(']\n')

fi.close()
fo.close()
