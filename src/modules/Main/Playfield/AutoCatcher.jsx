import { useEffect, useRef, useLayoutEffect, useState, useContext, useMemo, useCallback } from "react";
import { SettingsContext } from "../../../contexts/SettingsContext";
import { SkinContext } from "../../../contexts/SkinContext";
import "./AutoCatcher.scss";
import { calculatePreempt } from "../../../utils/ApproachRate";
import { parseHitObjects } from "../../../parser/HitobjectsParser";
import { PlayStateContext } from "../../../contexts/PlayStateContext";
import { CalculateScaleFromCircleSize, CalculateCatchWidthByCircleSize } from "../../../utils/CalculateCSScale";
import useRefState from "../../../hooks/useRefState";
import clsx from "clsx";
import fallbackCatcherSkin from "../../../assets/fallback-skin/fruit-catcher-idle@2x.png";

export function AutoCatcher({ beatmap, catcherPath }) {
	const ref = useRef(null);

	const [width, widthRef, setWidth] = useRefState(0); // the catcher width (osu px, total 512px width)
	const [parentWidth, parentWidthRef, setParentWidth] = useRefState(0);

	const {
		derandomize,
		hardRock,
		easy,
		skinnedCatcher
	} = useContext(SettingsContext);

	/*const [fruitSize, setFruitSize] = useState(0);

	const recalculateFruitSize = useCallback(() => {
		let CS = beatmap.difficulty.circleSize;
		if (hardRock) CS = Math.min(10, CS * 1.3);
		if (easy) CS = CS * 0.5;
		const baseSize = 97; // TODO: Verify this value
		const scale = CalculateScaleFromCircleSize(CS);
		const size = baseSize * scale / 512 * ref.current.offsetWidth;
		setFruitSize(size);
		console.log("Fruit size", size);
	}, [beatmap.difficulty.circleSize, hardRock, easy, verticalScale]);

	useEffect(() => {
		recalculateFruitSize();
	}, [beatmap, hardRock, easy, verticalScale]);*/
		

	const onResize = () => {
		setParentWidth(ref.current.parentElement.offsetWidth);
		//recalculateFruitSize();
	}

	useLayoutEffect(() => {
		onResize();
	}, []);
	

	useEffect(() => {
		const resizeObserver = new ResizeObserver(onResize);
		resizeObserver.observe(ref.current.parentElement);
		return () => resizeObserver.disconnect();
	}, []);

	useLayoutEffect(() => {
		const catcherWidth = CalculateCatchWidthByCircleSize(beatmap.difficulty.circleSize); // TODO: HR, EZ
		console.log("Catcher width", catcherWidth);
		setWidth(catcherWidth);
	}, [beatmap.difficulty.circleSize, width, hardRock, easy]);

	
	const {playing, playerRef, getPreciseTime} = useContext(PlayStateContext);

	// TODO: use svg or canvas for better performance
	const lastTime = useRef(-1000000); // Last time of the song
	const index = useRef(0); // Index of the current path segment

	useEffect(() => {
		lastTime.current = -1000000;
	}, [beatmap, catcherPath]);

	//console.log(catcherPath);

	const catcherPathRef = useRef(catcherPath);
	catcherPathRef.current = catcherPath;



	const update = () => {
		const path = catcherPathRef.current;
		if (!path?.length) return;
		const currentTime = getPreciseTime();
		if (currentTime === lastTime.current) return;
		let newIndex = index.current;
		if (Math.abs(currentTime - lastTime.current) > 20000) {
			newIndex = binarySearch(path, currentTime);	
		}
		while (newIndex + 1 < path.length && path[newIndex + 1].fromTime <= currentTime) {
			newIndex++;
		}
		while (newIndex - 1 >= 0 && path[newIndex].fromTime > currentTime) {
			newIndex--;
		}
		//console.log(newIndex, currentTime, newIndex + 1 < path.length && path[newIndex + 1].fromTime <= currentTime, path[newIndex + 1].fromTime);
		//console.log(newIndex, currentTime, newIndex - 1 >= 0 && path[newIndex].fromTime > currentTime, path[newIndex].fromTime);
		const width = parentWidthRef.current;
		const seg = path[newIndex];
		//console.log(seg, currentTime);
		const percent = Math.min((currentTime - seg.fromTime) / (seg.toTime - seg.fromTime), 1);
		//console.log(percent);

		const x = seg.fromX + (seg.toX - seg.fromX) * percent;


		index.current = newIndex;
		
		ref.current.style.transform = `translate(${x / 512 * width}px, 0)`;
		lastTime.current = currentTime;
	}


	const animationRef = useRef();
	useEffect(() => {
		if (!beatmap) return;
		const aniUpdate = () => {
			update();
			animationRef.current = requestAnimationFrame(aniUpdate);
		}
		animationRef.current = requestAnimationFrame(aniUpdate);
		return () => cancelAnimationFrame(animationRef.current);
	}, [parentWidth, width, beatmap, derandomize, hardRock, easy, catcherPath]);


	const {
		skin
	} = useContext(SkinContext);

	const catcherSkinFallback = skin?.catcherSkinFallback ?? true;
	const catcherSkin = skinnedCatcher ? 
		(skin?.["fruit-catcher-idle"] ??
			(catcherSkinFallback ? fallbackCatcherSkin : null))
		: null;

	return (
		<div
			className={clsx("auto-catcher", {skinned: catcherSkin})}
			style={{
				'width': `${width / 512 * parentWidth}px`,
				'left': `-${width / 512 * parentWidth / 2}px`,
				'--skin-height': `${width / 512 * parentWidth / 612 * 640}px`, // skin is 612*640
				'--catcher-skin': `url(${catcherSkin})`
			}}
			ref={ref}
		>
		</div>
	)
}


const binarySearch = (arr, t) => { // Find the last index of the seg that has fromTime <= t
	let l = 0, r = arr.length - 1;
	while (l < r) {
		let m = Math.floor((l + r + 1) / 2);
		if (arr[m].fromTime <= t) l = m;
		else r = m - 1;
	}
	return l;
}