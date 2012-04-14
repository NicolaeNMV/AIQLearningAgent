#!/bin/bash

phantomjs=`which phantomjs`
scriptjs=`dirname $0`/screenshot.js
$phantomjs $scriptjs $*
