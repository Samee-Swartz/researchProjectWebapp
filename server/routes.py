from flask import Flask, render_template, json, jsonify
import os
import sys
import hello_ext

app = Flask(__name__)

@app.route('/test')
def load():
	return hello_ext.greet()

@app.route('/_datasets')
def loadFiles():
	# json_url = os.path.join(, 'static', 'data/datasets.json')
	# json_data = app.open_resource('static/data/datasets.json')
	SITE_ROOT = os.path.realpath(os.path.dirname(__file__))
	json_url = os.path.join(SITE_ROOT, "static/data", "datasets.json")
	data = json.load(open(json_url))
	return jsonify(data=data)

@app.route('/')
def home():
	return render_template('index.html')

if __name__ == '__main__':
	app.run(debug=True)
