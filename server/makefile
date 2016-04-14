all: hello_ext.so

hello_ext.so: pyBindTest.o
	g++ -shared -std=c++11 -Wall -g -o hello_ext.so pyBindTest.o -lpython2.7 -lboost_python -lboost_system

pyBindTest.o: serverTest.cpp
	g++ -std=c++11 -Wall -fpic -c -g -o pyBindTest.o serverTest.cpp

clean:
	rm -f pyBindTest.so pyBindTest.o
