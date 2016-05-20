FOR INFORMATION ABOUT INSTALLING AND RUNNING -- CONTACT RAMOZA AND/OR RODICA

RELEVANT FILES:
webapp/researchProjectWebapp/app/components/Main.js contains the react code for rendering the interface
webapp/researchProjectWebapp/server/routes.py contains the flask server and redirects HTTP calls to functions
webapp/researchProjectWebapp/server/ONEXBindings.cpp contains the bindings from cpp to python
webapp/researchProjectWebapp/server/makefile is the makefile for the ONEXBindings.cpp
webapp/researchProjectWebapp/txtToJson.py contains the script to turn a .txt datafile into a json useable by chart-js

if you install any react libraries with npm, they will be added to webapp/researchProjectWebapp/node_modules/

To build the project use:
webapp/researchProjectWebapp/server$ make // compiles all cpp code and builds the bindings
webapp/researchProjectWebapp$ npm build // compiles the javascript into bundle.js.
webapp/researchProjectWebapp$ webpack // compiles the javascript into bundle.js. Use '-w' for continuous development

To deploy the flask server on localhost:5000 use:
webapp/researchProjectWebapp/server$ python routes.py

To view the webapp, keep the flask server running. In a seperate PuTTY window run:
google-chrome
This should launch a chrome window through Xming. From here go to localhost:5000 and the webapp should be visible

To see errors:
Check the terminal
In your webbrowser open the 'inspect' window and choose console.



Current functionality:
- The datasets from routes.py are loaded into the interface (GUI) and loaded into the ONEX software.
- Any changes to the 'Dataset' group on the GUI are sent to routes.py and shown in the 'Results' group
- When a dataset is selected, the query from dataset dropdown in populated.
- Any changes to the 'Query' group's 'Similarity Query' are sent to routes.py
- In 'Similiarity Query' mode, when 'View Results' is pressed, the ONEX returnSimilar function is called on the chosen Dataset and the chosen Query with the given start and length.

Development Problems:
- Most of the ONEX functions write to standard out instead of returning values. You may need to modify or create new functions to return data for use in the webapp.
- If I'm using the returnSimilar function to compute the similarity between a dataset and a series in it... I'll always get the series as the most similar...
- Grouping the datasets takes a while. (ECG.txt)

TODO:
- When running similarity query, remove the query series from the dataset, otherwise the distance will always be 0.
- Add functionality to the 'distance' group
- Add functionality to the 'Query from File' and 'Outlier Detection' modes
- Make the resulting query red on the graph



THIS IS NOT NECESSARY FOR onex.cs.wpi.edu!!
To install on a fresh system you'll need to install:
- Flask
- python (add /usr/include/python2.7 to path)
- boost
- web browser (chrome works)
- npm
-- webpack

The things above are all included in the install script. To run:
1.	webapp$ ./installScript.sh
	* when it asks about installing something hit yes. The python package will prompt you for a package description, just hit enter.
2.	nano ~/.bashrc
	*At the very bottom add:
	export CPLUS_INCLUDE_PATH=/usr/include/python2.7/
	*save and close nano (CTRL+O then CTRL+X)
	source ~/.bashrc
