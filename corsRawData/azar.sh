#! /bin/bash

function pentaProcess() {
	i=$2
	echo "sh_gamit -d $1 $i -orbit IGSF -eops usno -expt azar -nogifs -rinex_ftpsites ipgn 1>$i.out 2>$i.err &"
	echo $i
	
	i=$(( $i + 1 ))
	echo "sh_gamit -d $1 $i -orbit IGSF -eops usno -expt azar -nogifs -rinex_ftpsites ipgn 1>$i.out 2>$i.err &"
	echo $i
	
	i=$(( $i + 1 ))
	echo "sh_gamit -d $1 $i -orbit IGSF -eops usno -expt azar -nogifs -rinex_ftpsites ipgn 1>$i.out 2>$i.err &"
	echo $i
	
	i=$(( $i + 1 ))
	echo "sh_gamit -d $1 $i -orbit IGSF -eops usno -expt azar -nogifs -rinex_ftpsites ipgn 1>$i.out 2>$i.err &"
	echo $i
	
	i=$(( $i + 1 ))
	echo "sh_gamit -d $1 $i -orbit IGSF -eops usno -expt azar -nogifs -rinex_ftpsites ipgn 1>$i.out 2>$i.err &"
	echo $i
	
}

for((i=$2 ; i <= ($3 - 5) ; i + 1)); do
	pentaProcess $1 $i
done

exit 0	